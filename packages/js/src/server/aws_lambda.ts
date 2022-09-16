/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client as Honeybadger, Types } from '@honeybadger-io/core'
import type { Handler, Callback, Context } from 'aws-lambda'
import { AsyncStore } from './async_store';

export type SyncHandler<TEvent = any, TResult = any> = (
    event: TEvent,
    context: Context,
    callback: Callback<TResult>,
) => void;

export type AsyncHandler<TEvent = any, TResult = any> = (
    event: TEvent,
    context: Context,
) => Promise<TResult>;

function isHandlerSync(handler: Handler): handler is SyncHandler {
  return handler.length > 2
}

function reportToHoneybadger(hb: Honeybadger, err: Error | string | null, callback: (err: Error | string | null) => void) {
  hb.notify(err, {
    afterNotify: function () {
      hb.clear()
      callback(err)
    }
  })
}

function asyncHandler<TEvent = any, TResult = any>(handler: AsyncHandler<TEvent, TResult>, hb: Honeybadger): AsyncHandler<TEvent, TResult> {
  return function wrappedLambdaHandler(event, context) {
    hb.__setStore(AsyncStore)
    return new Promise<TResult>((resolve, reject) => {
      AsyncStore.run({ context: {}, breadcrumbs: [] }, () => {
        const timeoutHandler = setupTimeoutWarning(hb, context)
        try {
          const result = handler(event, context);
          // check if handler returns a promise
          if (result && result.then) {
            result
              .then(resolve)
              .catch(err => reportToHoneybadger(hb, err, reject))
              .finally(() => clearTimeout(timeoutHandler))
          }
          else {
            clearTimeout(timeoutHandler)
            resolve(result)
          }
        } catch (err) {
          clearTimeout(timeoutHandler)
          reportToHoneybadger(hb, err, reject)
        }
      })
    })
  }
}

function syncHandler<TEvent = any, TResult = any>(handler: SyncHandler<TEvent, TResult>, hb: Honeybadger): SyncHandler<TEvent, TResult> {
  return function wrappedLambdaHandler(event, context, cb) {
    hb.__setStore(AsyncStore)
    AsyncStore.run({ context: {}, breadcrumbs: [] }, () => {
      const timeoutHandler = setupTimeoutWarning(hb, context)
      try {
        handler(event, context, (error, result) => {
          clearTimeout(timeoutHandler)
          if (error) {
            return reportToHoneybadger(hb, error, cb)
          }

          cb(null, result)
        });
      } catch (err) {
        clearTimeout(timeoutHandler)
        reportToHoneybadger(hb, err, cb)
      }
    })
  }
}

function shouldReportTimeoutWarning(hb: Honeybadger, context: Context): boolean {
  return typeof context.getRemainingTimeInMillis === 'function' && !!((hb.config as Types.ServerlessConfig).reportTimeoutWarning)
}

function setupTimeoutWarning(hb: Honeybadger, context: Context) {
  if (!shouldReportTimeoutWarning(hb, context)) {
    return
  }

  const delay = context.getRemainingTimeInMillis() - ((hb.config as Types.ServerlessConfig).timeoutWarningThresholdMs)
  return setTimeout(() => {
    hb.notify(`${context.functionName}[${context.functionVersion}] may have timed out`)
  }, delay > 0 ? delay : 0)

}

export function lambdaHandler<TEvent = any, TResult = any>(handler: Handler<TEvent, TResult>): Handler<TEvent, TResult> {
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const hb: Honeybadger = this
  if (isHandlerSync(handler)) {
    return syncHandler(handler, hb)
  }

  return asyncHandler(handler, hb)
}

let listenerRemoved = false

/**
 * Removes AWS Lambda default listener that
 * exits the process before letting us report to honeybadger.
 */
export function removeAwsDefaultUncaughtExceptionListener() {
  if (listenerRemoved) {
    return
  }

  listenerRemoved = true
  const listeners = process.listeners('uncaughtException')
  if (listeners.length === 0) {
    return
  }

  // We assume it's the first listener
  process.removeListener('uncaughtException', listeners[0])
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from '@honeybadger-io/core'
import Honeybadger from '../server'

interface LambdaContext extends Record<string, unknown> {
  getRemainingTimeInMillis(): number;
}

type LambdaCallback<TResult> = (error?: Error | string | null, result?: TResult) => void | TResult;

type LambdaHandler<TResult = any> = (
    event: unknown,
    context: LambdaContext,
    callback?: LambdaCallback<TResult>,
) => void | Promise<TResult>;

export type SyncHandler<TResult = any> = (
    event: unknown,
    context: LambdaContext,
    callback: LambdaCallback<TResult>,
) => void;

export type AsyncHandler<TResult = any> = (
    event: unknown,
    context: LambdaContext,
) => Promise<TResult>;

function isHandlerSync(handler: LambdaHandler): handler is SyncHandler {
  return handler.length > 2
}

function reportToHoneybadger(hb: typeof Honeybadger, err: Error | string | null, callback: (err: Error | string | null) => void) {
  hb.notify(err, {
    afterNotify: function () {
      hb.clear()
      callback(err)
    }
  })
}

function asyncHandler<TResult = any>(handler: AsyncHandler<TResult>, hb: typeof Honeybadger): AsyncHandler<TResult> {
  return function wrappedLambdaHandler(event, context) {
    return new Promise<TResult>((resolve, reject) => {
      hb.run(() => {
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

function syncHandler<TResult = any>(handler: SyncHandler<TResult>, hb: typeof Honeybadger): SyncHandler<TResult> {
  return function wrappedLambdaHandler(event, context, cb) {
    hb.run(() => {
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

function shouldReportTimeoutWarning(hb: typeof Honeybadger, context: LambdaContext): boolean {
  return typeof context.getRemainingTimeInMillis === 'function' && !!((hb.config as Types.ServerlessConfig).reportTimeoutWarning)
}

function setupTimeoutWarning(hb: typeof Honeybadger, context: LambdaContext) {
  if (!shouldReportTimeoutWarning(hb, context)) {
    return
  }

  const delay = context.getRemainingTimeInMillis() - ((hb.config as Types.ServerlessConfig).timeoutWarningThresholdMs)
  return setTimeout(() => {
    hb.notify(`${context.functionName}[${context.functionVersion}] may have timed out`)
  }, delay > 0 ? delay : 0)

}

export function lambdaHandler<TResult = any>(handler: LambdaHandler<TResult>): LambdaHandler<TResult> {
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const hb: typeof Honeybadger = this
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

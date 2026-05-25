/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types, Util } from '@honeybadger-io/core'
import Honeybadger from '../server'
import type { Handler, Callback, Context } from 'aws-lambda'
import {
  buildRequestEventPayload,
  durationMs,
  seedRequestEventContext,
  startTimer,
} from './instrumentation/http_event'

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

function reportToHoneybadger(hb: typeof Honeybadger, err: Error | string | null, callback: (err: Error | string | null) => void) {
  hb.notify(err, {
    afterNotify: function () {
      hb.clear()
      callback(err)
    }
  })
}

// Detects API Gateway (v1 REST + v2 HTTP) and ALB events. v1/ALB carry
// `httpMethod` at the top level; v2 nests method under `requestContext.http`.
function isApiGatewayEvent(event: unknown): boolean {
  if (!event || typeof event !== 'object') {
    return false
  }

  const e = event as Record<string, unknown>
  if (typeof e.httpMethod === 'string') {
    return true
  }

  const rc = e.requestContext as Record<string, unknown> | undefined
  const http = rc && (rc.http as Record<string, unknown> | undefined)

  return !!(http && typeof http.method === 'string')
}

function getLambdaMethod(event: unknown): string | undefined {
  if (!event || typeof event !== 'object') {
    return undefined
  }

  const e = event as Record<string, unknown>
  if (typeof e.httpMethod === 'string') {
    return e.httpMethod
  }

  const rc = e.requestContext as Record<string, unknown> | undefined
  const http = rc && (rc.http as Record<string, unknown> | undefined)
  if (http && typeof http.method === 'string') {
    return http.method
  }

  return undefined
}

function getLambdaPath(event: unknown): string | undefined {
  if (!event || typeof event !== 'object') {
    return undefined
  }

  const e = event as Record<string, unknown>
  const rc = e.requestContext as Record<string, unknown> | undefined
  const http = rc && (rc.http as Record<string, unknown> | undefined)
  if (http && typeof http.path === 'string') {
    return http.path
  }

  if (typeof e.rawPath === 'string') {
    return e.rawPath
  }

  if (typeof e.path === 'string') {
    return e.path
  }

  return undefined
}

function lambdaStatus(result: unknown): number {
  if (result && typeof result === 'object') {
    const status = (result as Record<string, unknown>).statusCode
    if (typeof status === 'number') return status
  }
  return 200
}

function getLambdaHeaders(event: unknown): Record<string, string | string[] | undefined> {
  if (!event || typeof event !== 'object') return {}
  const headers = (event as Record<string, unknown>).headers
  if (!headers || typeof headers !== 'object') return {}
  return headers as Record<string, string | string[] | undefined>
}

function seedLambdaEventContext(hb: typeof Honeybadger, event: unknown, context: Context): void {
  if (isApiGatewayEvent(event)) {
    hb.setEventContext(seedRequestEventContext(getLambdaHeaders(event)))
    return
  }
  // Non-HTTP triggers (SQS, S3, EventBridge, scheduled) have no inbound headers.
  // Use the AWS request id as the requestId, and X-Ray's trace id (if set) as
  // the correlationId, otherwise mirror requestId.
  const requestId = context.awsRequestId
  const correlationId = process.env._X_AMZN_TRACE_ID || requestId
  hb.setEventContext({ requestId, correlationId })
}

function createLambdaRequestEmitter(hb: typeof Honeybadger, event: unknown): ((status: number) => void) | null {
  if (!isApiGatewayEvent(event)) return null
  if (!Util.resolveInsights(hb.config).http) return null

  const start = startTimer()
  let emitted = false
  return function emit(status: number) {
    if (emitted) return
    emitted = true
    hb.event('request.handled', buildRequestEventPayload({
      method: getLambdaMethod(event),
      path: getLambdaPath(event),
      status,
      duration: durationMs(start),
    }))
  }
}

function asyncHandler<TEvent = any, TResult = any>(handler: AsyncHandler<TEvent, TResult>, hb: typeof Honeybadger): AsyncHandler<TEvent, TResult> {
  return function wrappedLambdaHandler(event, context) {
    return new Promise<TResult>((resolve, reject) => {
      hb.run(() => {
        seedLambdaEventContext(hb, event, context)
        const emit = createLambdaRequestEmitter(hb, event)
        const timeoutHandler = setupTimeoutWarning(hb, context)
        try {
          const result = handler(event, context);
          // check if handler returns a promise
          if (result && result.then) {
            result
              .then((value) => {
                emit?.(lambdaStatus(value))
                resolve(value)
              })
              .catch(err => {
                emit?.(500)
                reportToHoneybadger(hb, err, reject)
              })
              .finally(() => clearTimeout(timeoutHandler))
          }
          else {
            clearTimeout(timeoutHandler)
            emit?.(lambdaStatus(result))
            resolve(result)
          }
        } catch (err) {
          clearTimeout(timeoutHandler)
          emit?.(500)
          reportToHoneybadger(hb, err, reject)
        }
      })
    })
  }
}

function syncHandler<TEvent = any, TResult = any>(handler: SyncHandler<TEvent, TResult>, hb: typeof Honeybadger): SyncHandler<TEvent, TResult> {
  return function wrappedLambdaHandler(event, context, cb) {
    hb.run(() => {
      seedLambdaEventContext(hb, event, context)
      const emit = createLambdaRequestEmitter(hb, event)
      const timeoutHandler = setupTimeoutWarning(hb, context)
      try {
        handler(event, context, (error, result) => {
          clearTimeout(timeoutHandler)
          if (error) {
            emit?.(500)
            return reportToHoneybadger(hb, error, cb)
          }

          emit?.(lambdaStatus(result))
          cb(null, result)
        });
      } catch (err) {
        clearTimeout(timeoutHandler)
        emit?.(500)
        reportToHoneybadger(hb, err, cb)
      }
    })
  }
}

function shouldReportTimeoutWarning(hb: typeof Honeybadger, context: Context): boolean {
  return typeof context.getRemainingTimeInMillis === 'function' && !!((hb.config as Types.ServerlessConfig).reportTimeoutWarning)
}

function setupTimeoutWarning(hb: typeof Honeybadger, context: Context) {
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

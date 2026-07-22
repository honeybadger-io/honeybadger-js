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

// Detects inbound HTTP Lambda events (API Gateway v1 REST, API Gateway v2 HTTP, and ALB).
// API Gateway v1 and ALB carry `httpMethod` at the top level; API Gateway v2 nests
// method under `requestContext.http`.
function isHttpLambdaEvent(event: unknown): boolean {
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
  if (isHttpLambdaEvent(event)) {
    hb.setEventContext(seedRequestEventContext(getLambdaHeaders(event)))
    return
  }
  // Non-HTTP triggers (SQS, S3, EventBridge, scheduled) have no inbound headers.
  // Use the AWS request id as the request_id, and X-Ray's trace id (if set) as
  // the correlation_id, otherwise mirror request_id.
  const requestId = context.awsRequestId
  const correlationId = process.env._X_AMZN_TRACE_ID || requestId
  hb.setEventContext({ request_id: requestId, correlation_id: correlationId })
}

// Returns an emitter for the `request.handled` event, or null when HTTP
// instrumentation is off (nothing to emit). The emitter also owns delivery:
// Lambda may freeze the execution environment the moment the handler completes,
// so after recording the event it flushes the queue and returns that promise.
// Callers must await it before resolving/invoking the callback. Delivery failures
// are logged by the events worker and must not break the handler.
function createLambdaRequestEmitter(hb: typeof Honeybadger, event: unknown): ((status: number) => Promise<void>) | null {
  if (!isHttpLambdaEvent(event)) return null
  if (!Util.resolveInsights(hb.config).http) return null

  const start = startTimer()
  let emitted = false
  return function emit(status: number): Promise<void> {
    if (emitted) return Promise.resolve()
    emitted = true
    hb.event('request.handled', buildRequestEventPayload({
      method: getLambdaMethod(event),
      path: getLambdaPath(event),
      status,
      duration: durationMs(start),
    }))
    return hb.flushAsync().catch(() => { /* swallow: errors are logged by the events worker */ })
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
              .then((value) => Promise.resolve(emit?.(lambdaStatus(value))).then(() => resolve(value)))
              .catch(err => Promise.resolve(emit?.(500)).then(() => reportToHoneybadger(hb, err, reject)))
              .finally(() => clearTimeout(timeoutHandler))
          }
          else {
            clearTimeout(timeoutHandler)
            Promise.resolve(emit?.(lambdaStatus(result))).then(() => resolve(result))
          }
        } catch (err) {
          clearTimeout(timeoutHandler)
          Promise.resolve(emit?.(500)).then(() => reportToHoneybadger(hb, err, reject))
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
            Promise.resolve(emit?.(500)).then(() => reportToHoneybadger(hb, error, cb))
            return
          }

          Promise.resolve(emit?.(lambdaStatus(result))).then(() => cb(null, result))
        });
      } catch (err) {
        clearTimeout(timeoutHandler)
        Promise.resolve(emit?.(500)).then(() => reportToHoneybadger(hb, err, cb))
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

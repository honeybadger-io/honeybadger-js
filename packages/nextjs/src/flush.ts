import Honeybadger from '@honeybadger-io/js';
import * as nextServer from 'next/server';

export type WaitUntil = (promise: Promise<unknown>) => void

/**
 * The `waitUntil` primitive the hosting platform injects per request. Next.js
 * resolves `after()` through this same accessor, and it is the only channel
 * available in Pages Router API routes, which are invoked as `(req, res)` with
 * no context argument to read it from.
 */
export function requestContextWaitUntil(): WaitUntil | undefined {
  const context = (globalThis as Record<symbol, unknown>)[Symbol.for('@next/request-context')] as
    | { get?: () => { waitUntil?: WaitUntil } | undefined }
    | undefined
  const waitUntil = context?.get?.()?.waitUntil
  return typeof waitUntil === 'function' ? waitUntil : undefined
}

/**
 * Ensure events are delivered before the serverless/edge runtime freezes, without
 * delaying the response where the runtime lets us avoid it.
 *
 * In order of preference: Next.js `after()` (App Router only — it needs App Router
 * request context, so Pages Router must not call it), then a `waitUntil` from the
 * platform request context, then a blocking `flushAsync()` when the runtime offers
 * neither.
 *
 * Delivery failures are logged by the events worker and must not break the handler.
 */
export function scheduleFlush(options: { useAfter?: boolean; waitUntil?: WaitUntil } = {}): Promise<void> | void {
  const flush = () => Honeybadger.flushAsync().catch(() => { /* logged by the events worker */ })

  if (options.useAfter) {
    const after = (nextServer as { after?: (cb: () => unknown) => void }).after
    if (typeof after === 'function') {
      // Exported but still refusable: `after()` throws outside a supported
      // context. Fall through to the remaining strategies rather than failing
      // the request.
      try {
        after(flush)
        return
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      catch (error) {
        // try waitUntil / blocking flush below
      }
    }
  }

  const waitUntil = options.waitUntil ?? requestContextWaitUntil()
  if (waitUntil) {
    waitUntil(flush())
    return
  }

  return flush()
}

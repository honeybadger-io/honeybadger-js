import Honeybadger from '@honeybadger-io/js';

/**
 * Edge-safe equivalents of the inbound instrumentation helpers in
 * `@honeybadger-io/js` (src/server/instrumentation/http_event.ts). They are
 * duplicated here because this module must also load on the edge runtime where
 * Node builtins (the `crypto` module, `process.hrtime`) are unavailable. Keep
 * the header names and the `request_id` / `correlation_id` contract in sync
 * with that file.
 *
 * Both request shapes Next.js uses are supported: the `*RequestEventContext` /
 * `*RequestEvent` pairs come in a web-`Headers`/`Request` variant (App Router
 * route handlers and middleware) and a Node-bag variant (Pages Router API
 * routes, which only ever run on the Node runtime).
 */
function generateId(): string {
  const webCrypto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  if (webCrypto && typeof webCrypto.randomUUID === 'function') {
    try {
      return webCrypto.randomUUID()
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    catch (error) {
      // fall through to manual generation
    }
  }
  // v4-shaped, not crypto-quality. Acceptable since this is a correlation id,
  // not a security token.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0
    const v = ch === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function readHeader(headers: Headers, name: string): string | undefined {
  const value = headers.get(name)
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
}

// Node-style headers bag, as seen on the Pages Router `req` (an
// `IncomingMessage`): lowercased keys, values that may be arrays.
export type NodeHeaders = Record<string, string | string[] | undefined>

// Minimal shape of a Node-style request (Pages Router `NextApiRequest`),
// covering only what the instrumentation reads.
export type NodeRequestLike = { method?: string; url?: string; headers: NodeHeaders }

function readNodeHeader(headers: NodeHeaders, name: string): string | undefined {
  if (!headers) {
    return undefined
  }
  const lower = name.toLowerCase()
  let value: string | string[] | undefined = headers[lower]
  if (value === undefined) {
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === lower) {
        value = headers[key]
        break
      }
    }
  }
  if (Array.isArray(value)) {
    value = value[0]
  }
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
}

// A type alias (not an interface) so it stays assignable to the
// Record<string, unknown> that setEventContext expects.
export type RequestIds = {
  request_id: string
  correlation_id: string
}

// Shared id precedence. Kept in one place (rather than once per request shape)
// so the header-name contract documented above is only spelled out once.
function seedIds(read: (name: string) => string | undefined): RequestIds {
  const requestId =
    read('x-request-id') ??
    read('request-id') ??
    generateId()
  const correlationId =
    read('x-correlation-id') ??
    read('x-amzn-trace-id') ??
    requestId
  return { request_id: requestId, correlation_id: correlationId }
}

// App Router / middleware: headers are a web `Headers` instance.
export function seedRequestEventContext(headers: Headers): RequestIds {
  return seedIds((name) => readHeader(headers, name))
}

// Pages Router: headers are a Node bag (Pages routes are Node-only, never edge).
export function seedNodeRequestEventContext(headers: NodeHeaders): RequestIds {
  return seedIds((name) => readNodeHeader(headers, name))
}

export function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

// Mirrors Util.resolveInsights from @honeybadger-io/core: the master gate and
// the per-source flag must both be on.
export function insightsHttpEnabled(): boolean {
  const insights = Honeybadger.config.insights
  return insights?.enabled === true && insights?.http === true
}

// The ids are embedded directly in the payload (instead of relying on the
// store's eventContext merge) so the event carries them even on the edge
// runtime, where there is no per-request store isolation. On the Node.js
// runtime they match the seeded event context, so embedding is a no-op.
function emitHandledEvent(method: string | undefined, path: string | undefined, status: number | undefined, start: number, ids: RequestIds): void {
  const payload: Record<string, unknown> = {
    method,
    duration: Math.round(now() - start),
    ...ids,
  }
  if (typeof path === 'string') {
    payload.path = path
  }
  if (typeof status === 'number') {
    payload.status = status
  }
  Honeybadger.event('request.handled', payload)
}

// App Router / middleware: `req.url` is absolute, so parse out the pathname.
export function emitRequestEvent(req: Request, status: number | undefined, start: number, ids: RequestIds): void {
  let path: string | undefined
  try {
    path = new URL(req.url).pathname
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  catch (error) {
    // relative or malformed URL — leave path unset
  }
  emitHandledEvent(req.method, path, status, start, ids)
}

// Pages Router: `req.url` is a relative path that may carry a query string.
export function emitNodeRequestEvent(req: NodeRequestLike, status: number | undefined, start: number, ids: RequestIds): void {
  const path = typeof req.url === 'string' ? req.url.split('?')[0] : undefined
  emitHandledEvent(req.method, path, status, start, ids)
}

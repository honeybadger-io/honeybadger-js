import Honeybadger from '@honeybadger-io/js';

/**
 * Edge-safe equivalents of the inbound instrumentation helpers in
 * `@honeybadger-io/js` (src/server/instrumentation/http_event.ts). They are
 * duplicated here because this module must load in every runtime where
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
// Record<string, unknown> that event payloads expect.
export type RequestIds = {
  request_id: string
  correlation_id: string
  // Present only when an OpenTelemetry span is available. Carried alongside the two ids
  // above rather than folded into them, so a fault can be joined to the trace — and to the
  // `request.handled` events — of the request it failed in.
  trace_id?: string
  span_id?: string
}

/**
 * Span and trace ids, when OpenTelemetry is in play.
 */
export type SpanIds = { traceId?: string; spanId?: string }

/**
 * Shared id precedence. Kept in one place (rather than once per request shape)
 * so the header-name contract documented above is only spelled out once.
 *
 * The span ids do double duty. They are emitted as `trace_id` / `span_id`, and they also
 * back-fill `request_id` / `correlation_id` when no header supplied them — a trace id
 * already has exactly the semantics we want for a correlation id, since W3C trace context
 * reuses an inbound `traceparent` and mints a new one when there is none.
 *
 * That double duty is what makes a fault joinable to its request's events: both paths seed
 * from the same span, so with no id headers present a fault and its `request.handled` event
 * carry identical values for all four.
 */
function seedIds(
  read: (name: string) => string | undefined,
  span: SpanIds = {}
): RequestIds {
  const requestId =
    read('x-request-id') ??
    read('request-id') ??
    span.spanId ??
    generateId()
  const correlationId =
    read('x-correlation-id') ??
    read('x-amzn-trace-id') ??
    span.traceId ??
    requestId

  const ids: RequestIds = { request_id: requestId, correlation_id: correlationId }
  if (span.traceId) {
    ids.trace_id = span.traceId
  }
  if (span.spanId) {
    ids.span_id = span.spanId
  }

  return ids
}

/**
 * The active span's ids, or an empty object when OpenTelemetry is not in play.
 *
 * `@opentelemetry/api` is an optional peer dependency, and this module is reachable from
 * every runtime entry point, so it is loaded on demand and any failure to resolve it is
 * treated as "no tracing configured" rather than an error.
 */
export async function activeSpanIds(): Promise<SpanIds> {
  try {
    const { trace } = await import('@opentelemetry/api')
    const spanContext = trace.getActiveSpan()?.spanContext()
    if (!spanContext) {
      return {}
    }

    return { traceId: spanContext.traceId, spanId: spanContext.spanId }
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  catch (error) {
    return {}
  }
}

// App Router / middleware: headers are a web `Headers` instance.
export function seedRequestEventContext(headers: Headers, span: SpanIds = {}): RequestIds {
  return seedIds((name) => readHeader(headers, name), span)
}

// Pages Router: headers are a Node bag (Pages routes are Node-only, never edge).
export function seedNodeRequestEventContext(headers: NodeHeaders, span: SpanIds = {}): RequestIds {
  return seedIds((name) => readNodeHeader(headers, name), span)
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
// store's eventContext merge) so the event carries them even where the
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

/**
 * OpenTelemetry path. Header values are not on the span by default; they arrive as
 * `http.request.header.*` attributes when the HTTP instrumentation is configured with
 * `headersToSpanAttributes`. Hyphens become underscores under the older semantic
 * conventions and are preserved under the stable ones, so both spellings are read.
 *
 * When no header is present the span and trace ids are used, so the ids stay
 * meaningful — and joinable to a trace — on platforms where the HTTP layer is not
 * visible, such as serverless platforms.
 */
export function seedSpanEventContext(
  attributes: Record<string, unknown>,
  spanContext: SpanIds
): RequestIds {
  const read = (name: string): string | undefined => {
    const lower = name.toLowerCase()
    for (const key of [
      `http.request.header.${lower}`,
      `http.request.header.${lower.replace(/-/g, '_')}`,
    ]) {
      const value = attributes[key]
      const first = Array.isArray(value) ? value[0] : value
      if (typeof first === 'string' && first.trim().length) {
        return first.trim()
      }
    }
    return undefined
  }

  return seedIds(read, {
    traceId: spanContext.traceId || undefined,
    spanId: spanContext.spanId || undefined,
  })
}

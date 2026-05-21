/**
 * Shared helpers for HTTP-event instrumentation.
 *
 * Used by inbound (Express, Fastify, Lambda, Next.js) and — in a later PR —
 * outbound (`http`, `https`, `fetch`) integrations.
 */

export type HeaderValue = string | string[] | undefined
export type HeadersInput = Record<string, HeaderValue> | null | undefined

/**
 * Reads a header value from a Node-style headers bag in a case-insensitive
 * manner. When the value is an array (e.g. `Set-Cookie`), returns the first
 * element. Returns `undefined` when the header is missing or empty.
 */
function readHeader(headers: HeadersInput, name: string): string | undefined {
  if (!headers) return undefined

  const lower = name.toLowerCase()
  let value: HeaderValue = headers[lower]

  if (value === undefined) {
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === lower) {
        value = headers[key]
        break
      }
    }
  }

  if (Array.isArray(value)) value = value[0]
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
}

/**
 * Generates a UUID-like identifier. Prefers `crypto.randomUUID()` when
 * available (Node 14.17+); falls back to a Math.random-based v4-shaped string.
 */
function generateId(): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = (globalThis as any).crypto
  if (c && typeof c.randomUUID === 'function') {
    try {
      return c.randomUUID()
    } catch (_e) {
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

/**
 * Returns a unique-per-request id. Reads `x-request-id`, then `request-id`
 * headers; falls back to a generated id when neither is present.
 */
export function getOrCreateRequestId(headers: HeadersInput): string {
  return (
    readHeader(headers, 'x-request-id') ??
    readHeader(headers, 'request-id') ??
    generateId()
  )
}

/**
 * Returns a correlation id that may span multiple requests in a logical trace.
 * Reads `x-correlation-id`, then `x-amzn-trace-id`; falls back to the supplied
 * `requestId` so callers always have both fields populated.
 */
export function getOrCreateCorrelationId(headers: HeadersInput, requestId: string): string {
  return (
    readHeader(headers, 'x-correlation-id') ??
    readHeader(headers, 'x-amzn-trace-id') ??
    requestId
  )
}

/**
 * Convenience helper for framework integrations: read request/correlation ids
 * from the request headers and return both. When no headers contain either
 * value, both ids are generated and `requestId === correlationId`.
 */
export function seedRequestEventContext(
  headers: HeadersInput
): { requestId: string; correlationId: string } {
  const requestId = getOrCreateRequestId(headers)
  const correlationId = getOrCreateCorrelationId(headers, requestId)
  return { requestId, correlationId }
}

/**
 * Starts a high-resolution timer.
 */
export function startTimer(): bigint {
  return process.hrtime.bigint()
}

const NS_PER_MS = BigInt(1_000_000)

/**
 * Returns the integer number of milliseconds elapsed since `start`.
 */
export function durationMs(start: bigint): number {
  const diff = process.hrtime.bigint() - start
  return Number(diff / NS_PER_MS)
}

export interface RequestEventInput {
  method?: string
  path?: string
  route?: string
  status?: number
  duration?: number
  extra?: Record<string, unknown>
}

/**
 * Builds the per-request event payload. `requestId` and `correlationId` are NOT
 * added here — they live on `eventContext` and are merged onto every event by
 * the client.
 */
export function buildRequestEventPayload(input: RequestEventInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {}

  if (input.method !== undefined) payload.method = input.method
  if (input.path !== undefined) payload.path = input.path
  if (input.route !== undefined) payload.route = input.route
  if (input.status !== undefined) payload.status = input.status
  if (input.duration !== undefined) payload.duration = input.duration

  if (input.extra) {
    for (const k of Object.keys(input.extra)) {
      if (!(k in payload)) payload[k] = input.extra[k]
    }
  }

  return payload
}

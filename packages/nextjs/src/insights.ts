import Honeybadger from '@honeybadger-io/js';
import { insightsHttpEnabled, seedSpanEventContext } from './insights-instrumentation';
import { scheduleFlush } from './flush';

/**
 * Next.js instruments itself with OpenTelemetry and emits one root span per request,
 * `[http.method] [next.route]`, tagged `next.span_type: BaseServer.handleRequest`. Its
 * attributes carry the method, route, target and status — essentially the payload the
 * old `withHoneybadger` wrapper assembled by hand — so mapping that span to a
 * `request.handled` event replaces the wrapper without needing to wrap anything.
 *
 * Next instruments but does not export: spans only reach us once a tracer provider with
 * this processor is registered. See `registerHoneybadgerInsights`.
 */
const NEXT_REQUEST_SPAN_TYPE = 'BaseServer.handleRequest'

/**
 * Request headers to copy onto the root span, so `request_id` and `correlation_id` can be
 * reused from an inbound request instead of falling back to the span and trace ids.
 *
 * Header values are not span attributes by default. `@vercel/otel` applies this map when
 * it creates the root span, which is the span this processor reads — and, unlike Node's
 * HTTP instrumentation, it works on serverless and the edge runtime too.
 *
 * Spread it into your own `registerOTel` call if you register OpenTelemetry yourself:
 *
 * ```ts
 * registerOTel({
 *   attributesFromHeaders: { ...HONEYBADGER_HEADER_ATTRIBUTES },
 *   spanProcessors: [honeybadgerSpanProcessor()],
 * })
 * ```
 *
 * Keep the header names in sync with `seedIds` in ./insights-instrumentation.
 */
export const HONEYBADGER_HEADER_ATTRIBUTES: Record<string, string> = {
  'http.request.header.x-request-id': 'x-request-id',
  'http.request.header.request-id': 'request-id',
  'http.request.header.x-correlation-id': 'x-correlation-id',
  'http.request.header.x-amzn-trace-id': 'x-amzn-trace-id',
}

// Minimal structural types, so `@opentelemetry/*` stays an optional peer rather than
// something every consumer of this package has to install.
type HrTime = [number, number]

type ReadableSpanLike = {
  attributes?: Record<string, unknown>
  duration?: HrTime
  spanContext?: () => { traceId?: string; spanId?: string }
}

export type SpanProcessorLike = {
  onStart(): void
  onEnd(span: ReadableSpanLike): void
  forceFlush(): Promise<void>
  shutdown(): Promise<void>
}

function readString(attributes: Record<string, unknown>, ...names: string[]): string | undefined {
  for (const name of names) {
    const value = attributes[name]
    if (typeof value === 'string' && value.length) {
      return value
    }
  }
  return undefined
}

function readNumber(attributes: Record<string, unknown>, ...names: string[]): number | undefined {
  for (const name of names) {
    const value = attributes[name]
    if (typeof value === 'number') {
      return value
    }
    if (typeof value === 'string' && value.trim().length && Number.isFinite(Number(value))) {
      return Number(value)
    }
  }
  return undefined
}

function durationMs(duration: HrTime | undefined): number {
  if (!Array.isArray(duration) || duration.length !== 2) {
    return 0
  }
  const [seconds, nanos] = duration
  return Math.round(seconds * 1000 + nanos / 1e6)
}

/**
 * Path without the query string. `http.target` includes the query under the older
 * semantic conventions; `url.path` is already bare under the stable ones.
 */
function readPath(attributes: Record<string, unknown>): string | undefined {
  const target = readString(attributes, 'url.path', 'http.target')
  return typeof target === 'string' ? target.split('?')[0] : undefined
}

/**
 * Maps Next.js's per-request span to a Honeybadger `request.handled` Insights event.
 *
 * Pass it to whatever registers OpenTelemetry in your `instrumentation.ts`:
 *
 * ```ts
 * import { registerOTel } from '@vercel/otel'
 * import { honeybadgerSpanProcessor } from '@honeybadger-io/nextjs'
 *
 * export function register() {
 *   registerOTel({ serviceName: 'my-app', spanProcessors: [honeybadgerSpanProcessor()] })
 * }
 * ```
 *
 * `registerHoneybadgerInsights()` is the one-line equivalent when you have no other
 * OpenTelemetry setup of your own.
 */
export function honeybadgerSpanProcessor(): SpanProcessorLike {
  return {
    onStart() {
      // Nothing to do: the event is emitted once the request span is complete, which is
      // when the status and duration are known.
    },

    onEnd(span: ReadableSpanLike) {
      const attributes = span.attributes ?? {}
      if (attributes['next.span_type'] !== NEXT_REQUEST_SPAN_TYPE) {
        return
      }

      // Checked per event rather than at registration: configuration is loaded by
      // `register()` importing the honeybadger config files, which may happen after the
      // processor is constructed.
      if (!insightsHttpEnabled()) {
        return
      }

      const spanContext = typeof span.spanContext === 'function' ? span.spanContext() : {}
      const ids = seedSpanEventContext(attributes, spanContext ?? {})

      const payload: Record<string, unknown> = {
        method: readString(attributes, 'http.request.method', 'http.method'),
        duration: durationMs(span.duration),
        ...ids,
      }

      const path = readPath(attributes)
      if (path) {
        payload.path = path
      }

      const status = readNumber(attributes, 'http.response.status_code', 'http.status_code')
      if (typeof status === 'number') {
        payload.status = status
      }

      // Emitted alongside the ids rather than replacing them, so an event can be joined
      // to a trace in another tool without changing what existing consumers read.
      if (spanContext?.traceId) {
        payload.trace_id = spanContext.traceId
      }
      if (spanContext?.spanId) {
        payload.span_id = spanContext.spanId
      }

      Honeybadger.event('request.handled', payload)

      // A span processor batches on its own lifecycle, which is not enough on a platform
      // that can freeze the invocation as soon as the response is sent.
      scheduleFlush({ useAfter: true })
    },

    async forceFlush() {
      await Honeybadger.flushAsync().catch(() => { /* logged by the events worker */ })
    },

    async shutdown() {
      await Honeybadger.flushAsync().catch(() => { /* logged by the events worker */ })
    },
  }
}

export type RegisterHoneybadgerInsightsOptions = {
  serviceName?: string
  /** Additional attribute-name -> header-name pairs, merged over the defaults. */
  attributesFromHeaders?: Record<string, string>
}

/**
 * Registers OpenTelemetry with only Honeybadger's span processor attached, for apps that
 * have no OpenTelemetry setup of their own. Call it from `register()` in
 * `instrumentation.ts`.
 *
 * `@vercel/otel` is an optional peer dependency: it is only needed for Insights, and it
 * is what makes this work on the edge runtime, where the Node SDK cannot load. If you
 * already call `registerOTel` yourself, add `honeybadgerSpanProcessor()` to your
 * `spanProcessors` instead of calling this — registering twice would compete for the
 * global provider.
 */
export async function registerHoneybadgerInsights(
  options: RegisterHoneybadgerInsightsOptions = {}
): Promise<void> {
  let registerOTel: (config: Record<string, unknown>) => void

  try {
    ({ registerOTel } = await import('@vercel/otel'))
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  catch (error) {
    Honeybadger.logger.error(
      '[Honeybadger] Insights request events need @vercel/otel. Install it, or drop the ' +
      'registerHoneybadgerInsights() call — error reporting works without it.'
    )
    return
  }

  registerOTel({
    serviceName: options.serviceName ?? process.env.NEXT_PUBLIC_HONEYBADGER_SERVICE_NAME ?? 'nextjs-app',
    // Without this the id headers never reach the span, so request_id and
    // correlation_id would always fall back to the span and trace ids.
    attributesFromHeaders: {
      ...HONEYBADGER_HEADER_ATTRIBUTES,
      ...options.attributesFromHeaders,
    },
    spanProcessors: [honeybadgerSpanProcessor()],
  })
}

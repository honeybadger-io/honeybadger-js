import Honeybadger from '@honeybadger-io/js'
import { HONEYBADGER_HEADER_ATTRIBUTES, honeybadgerSpanProcessor } from './insights'

const REQUEST_SPAN = 'BaseServer.handleRequest'

type SpanLike = {
  attributes?: Record<string, unknown>
  duration?: [number, number]
  spanContext?: () => { traceId?: string; spanId?: string }
}

function span(attributes: Record<string, unknown>, options: {
  duration?: [number, number]
  traceId?: string
  spanId?: string
} = {}): SpanLike {
  return {
    attributes,
    duration: options.duration ?? [0, 0],
    spanContext: () => ({
      traceId: options.traceId ?? 'trace-aaa',
      spanId: options.spanId ?? 'span-bbb',
    }),
  }
}

function requestSpan(extra: Record<string, unknown> = {}, options = {}) {
  return span({ 'next.span_type': REQUEST_SPAN, ...extra }, options)
}

describe('honeybadgerSpanProcessor', () => {
  let events: Array<{ name: string; payload: Record<string, unknown> }>

  beforeEach(() => {
    events = []
    Honeybadger.configure({
      apiKey: 'test-key',
      insights: { enabled: true, http: true },
    })
    jest.spyOn(Honeybadger, 'event').mockImplementation(((name, payload) => {
      events.push({ name: name as string, payload: payload as Record<string, unknown> })
    }) as typeof Honeybadger.event)
    // scheduleFlush() delivers via flushAsync; keep it off the network.
    jest.spyOn(Honeybadger, 'flushAsync').mockResolvedValue(true as never)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  function onEnd(s: SpanLike) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    honeybadgerSpanProcessor().onEnd(s as any)
  }

  it('emits request.handled for the Next.js request span', () => {
    onEnd(requestSpan({
      'http.method': 'GET',
      'http.target': '/api/hello',
      'http.status_code': 200,
    }, { duration: [1, 500_000_000] }))

    expect(events).toHaveLength(1)
    expect(events[0].name).toBe('request.handled')
    expect(events[0].payload).toMatchObject({
      method: 'GET',
      path: '/api/hello',
      status: 200,
      duration: 1500,
    })
  })

  it('ignores spans that are not the request span', () => {
    onEnd(span({ 'next.span_type': 'AppRender.getBodyResult', 'http.method': 'GET' }))
    onEnd(span({ 'http.method': 'GET' }))

    expect(events).toHaveLength(0)
  })

  it('emits nothing when insights http is disabled', () => {
    Honeybadger.configure({ apiKey: 'test-key', insights: { enabled: false, http: true } })
    onEnd(requestSpan({ 'http.method': 'GET' }))

    Honeybadger.configure({ apiKey: 'test-key', insights: { enabled: true, http: false } })
    onEnd(requestSpan({ 'http.method': 'GET' }))

    expect(events).toHaveLength(0)
  })

  it('reads the stable semantic-convention attribute names too', () => {
    onEnd(requestSpan({
      'http.request.method': 'POST',
      'url.path': '/submit',
      'http.response.status_code': 201,
    }))

    expect(events[0].payload).toMatchObject({ method: 'POST', path: '/submit', status: 201 })
  })

  it('strips the query string from the path', () => {
    onEnd(requestSpan({ 'http.method': 'GET', 'http.target': '/search?q=badger&page=2' }))

    expect(events[0].payload.path).toBe('/search')
  })

  it('always reports trace_id and span_id alongside the ids', () => {
    onEnd(requestSpan({ 'http.method': 'GET' }, { traceId: 'trace-123', spanId: 'span-456' }))

    expect(events[0].payload).toMatchObject({ trace_id: 'trace-123', span_id: 'span-456' })
  })

  describe('request_id and correlation_id', () => {
    it('falls back to the span and trace ids when no headers were captured', () => {
      onEnd(requestSpan({ 'http.method': 'GET' }, { traceId: 'trace-123', spanId: 'span-456' }))

      // A trace id already behaves like a correlation id: W3C trace context reuses an
      // inbound traceparent and mints a new one when there is none.
      expect(events[0].payload).toMatchObject({
        request_id: 'span-456',
        correlation_id: 'trace-123',
      })
    })

    it('prefers captured headers over the span ids', () => {
      onEnd(requestSpan({
        'http.method': 'GET',
        'http.request.header.x-request-id': 'req-from-header',
        'http.request.header.x-correlation-id': 'corr-from-header',
      }, { traceId: 'trace-123', spanId: 'span-456' }))

      expect(events[0].payload).toMatchObject({
        request_id: 'req-from-header',
        correlation_id: 'corr-from-header',
        // still emitted, so the event can be joined to a trace
        trace_id: 'trace-123',
        span_id: 'span-456',
      })
    })

    it('reads the underscored attribute spelling used by older semantic conventions', () => {
      onEnd(requestSpan({
        'http.method': 'GET',
        'http.request.header.x_request_id': 'req-underscored',
      }))

      expect(events[0].payload.request_id).toBe('req-underscored')
    })

    it('takes the first value when a header was captured as an array', () => {
      onEnd(requestSpan({
        'http.method': 'GET',
        'http.request.header.x-request-id': ['req-first', 'req-second'],
      }))

      expect(events[0].payload.request_id).toBe('req-first')
    })

    it('ignores blank header values', () => {
      onEnd(requestSpan({
        'http.method': 'GET',
        'http.request.header.x-request-id': '   ',
      }, { spanId: 'span-456' }))

      expect(events[0].payload.request_id).toBe('span-456')
    })
  })

  it('survives a span with no attributes or context', () => {
    expect(() => onEnd({})).not.toThrow()
    expect(events).toHaveLength(0)
  })

  describe('HONEYBADGER_HEADER_ATTRIBUTES', () => {
    // The map tells @vercel/otel which headers to copy onto the root span. If it drifts
    // from what the seeder reads, header ids silently stop being reused and everything
    // falls back to the span/trace ids - which still works, so nothing would fail loudly.
    it('every mapped attribute is actually read back as an id', () => {
      const entries = Object.entries(HONEYBADGER_HEADER_ATTRIBUTES)
      expect(entries.length).toBeGreaterThan(0)

      for (const [attribute, header] of entries) {
        expect(attribute).toBe(`http.request.header.${header}`)

        events = []
        onEnd(requestSpan({ 'http.method': 'GET', [attribute]: `value-of-${header}` }))

        const { request_id: requestId, correlation_id: correlationId } = events[0].payload
        expect([requestId, correlationId]).toContain(`value-of-${header}`)
      }
    })
  })
})

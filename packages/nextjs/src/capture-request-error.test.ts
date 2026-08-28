import Honeybadger from '@honeybadger-io/js'
import { captureRequestError } from './capture-request-error'
import type { RequestErrorContext, RequestErrorRequest } from './capture-request-error'

// Mutable so a test can install or remove `after` without reloading the module:
// scheduleFlush reads nextServer.after at call time through the namespace.
const nextServerMocks: { after?: (cb: () => unknown) => void } = {}
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server') as Record<string, unknown>
  return {
    ...actual,
    get after() {
      return nextServerMocks.after
    },
  }
})

function request(headers: RequestErrorRequest['headers'] = {}): RequestErrorRequest {
  return { path: '/api/hello?x=1', method: 'POST', headers }
}

function errorContext(overrides: Partial<RequestErrorContext> = {}): RequestErrorContext {
  return {
    routerKind: 'App Router',
    routePath: '/api/hello',
    routeType: 'route',
    ...overrides,
  }
}

describe('captureRequestError', () => {
  let notifyAsync: jest.SpyInstance
  let flushAsync: jest.SpyInstance
  let setEventContext: jest.SpyInstance

  const noticeContext = () => notifyAsync.mock.calls[0][1].context as Record<string, unknown>

  beforeEach(() => {
    nextServerMocks.after = undefined
    Honeybadger.configure({ apiKey: 'test-key' })
    notifyAsync = jest.spyOn(Honeybadger, 'notifyAsync').mockResolvedValue(undefined as never)
    flushAsync = jest.spyOn(Honeybadger, 'flushAsync').mockResolvedValue(true as never)
    setEventContext = jest.spyOn(Honeybadger, 'setEventContext')
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('reports the error with the request and route context', async () => {
    const error = new Error('boom')

    await captureRequestError(error, request(), errorContext())

    expect(notifyAsync).toHaveBeenCalledTimes(1)
    expect(notifyAsync.mock.calls[0][0]).toBe(error)
    expect(noticeContext()).toMatchObject({
      path: '/api/hello?x=1',
      method: 'POST',
      router_kind: 'App Router',
      route_path: '/api/hello',
      route_type: 'route',
    })
  })

  it('schedules a flush so the report survives a frozen invocation', async () => {
    await captureRequestError(new Error('boom'), request(), errorContext())

    expect(flushAsync).toHaveBeenCalled()
  })

  it('prefers Next.js after() to deliver the report off the response path', async () => {
    const afterCallbacks: Array<() => unknown> = []
    nextServerMocks.after = (cb) => { afterCallbacks.push(cb) }

    await captureRequestError(new Error('boom'), request(), errorContext())

    expect(afterCallbacks).toHaveLength(1)
    // deferred, not run inline
    expect(flushAsync).not.toHaveBeenCalled()
    await afterCallbacks[0]()
    expect(flushAsync).toHaveBeenCalled()
  })

  // Regression guard. Writing ids to the event context here landed on a store shared by
  // the whole process or isolate, because this runs outside any Honeybadger.run(), so the
  // ids leaked into later requests' events.
  it('never writes to the shared event context', async () => {
    await captureRequestError(
      new Error('boom'),
      request({ 'x-request-id': 'req-1', 'x-correlation-id': 'corr-1' }),
      errorContext()
    )

    expect(setEventContext).not.toHaveBeenCalled()
  })

  describe('Next.js control-flow errors', () => {
    // redirect(), notFound(), forbidden() and unauthorized() are implemented by throwing,
    // and the framework catches them upstream. Reporting them would turn every redirect
    // into a fault.
    it.each([
      ['NEXT_REDIRECT;replace;/login;307;', 'redirect()'],
      ['NEXT_NOT_FOUND', 'notFound()'],
      ['NEXT_HTTP_ERROR_FALLBACK;403', 'forbidden()'],
    ])('ignores %s (%s)', async (digest) => {
      const error = Object.assign(new Error('control flow'), { digest })

      await captureRequestError(error, request(), errorContext())

      expect(notifyAsync).not.toHaveBeenCalled()
    })

    it('still reports a genuine error that carries a React digest', async () => {
      // React tags real errors with an opaque hash, which must not be mistaken for a
      // framework signal.
      const error = Object.assign(new Error('boom'), { digest: '1234567890' })

      await captureRequestError(error, request(), errorContext())

      expect(notifyAsync).toHaveBeenCalledTimes(1)
    })

    it('reports errors whose digest is not a string', async () => {
      const error = Object.assign(new Error('boom'), { digest: 42 })

      await captureRequestError(error, request(), errorContext())

      expect(notifyAsync).toHaveBeenCalledTimes(1)
    })
  })

  describe('request and correlation ids', () => {
    it('reuses the ids from the request headers', async () => {
      await captureRequestError(
        new Error('boom'),
        request({ 'x-request-id': 'req-1', 'x-correlation-id': 'corr-1' }),
        errorContext()
      )

      expect(noticeContext()).toMatchObject({ request_id: 'req-1', correlation_id: 'corr-1' })
    })

    it('generates a request id when no header carries one', async () => {
      await captureRequestError(new Error('boom'), request(), errorContext())

      const { request_id: requestId, correlation_id: correlationId } = noticeContext()
      expect(typeof requestId).toBe('string')
      expect(requestId).toBeTruthy()
      // With nothing to correlate against, the correlation id falls back to the request id.
      expect(correlationId).toBe(requestId)
    })

    it('reuses a correlation id without a request id header', async () => {
      await captureRequestError(
        new Error('boom'),
        request({ 'x-correlation-id': 'corr-1' }),
        errorContext()
      )

      const { request_id: requestId, correlation_id: correlationId } = noticeContext()
      expect(correlationId).toBe('corr-1')
      expect(requestId).not.toBe('corr-1')
    })

    it('handles header names case-insensitively and array values', async () => {
      await captureRequestError(
        new Error('boom'),
        request({ 'X-Request-ID': ['req-first', 'req-second'] }),
        errorContext()
      )

      expect(noticeContext().request_id).toBe('req-first')
    })
  })
})

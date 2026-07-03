/* eslint-disable @typescript-eslint/no-explicit-any */
import Honeybadger from '@honeybadger-io/js'
import type { NextResponse } from 'next/server'
import { withHoneybadger } from './with-honeybadger'

describe('withHoneybadger', () => {
  let workerLogSpy: jest.SpyInstance
  let notifyAsyncSpy: jest.SpyInstance

  // The events worker is `protected` on Client; in tests we read it via `as any`.
  const eventsWorker = () => (Honeybadger as any).__eventsWorker

  // client.event() pushes to the worker after the async beforeEvent chain
  // resolves — give it a tick.
  const waitForEvents = () => new Promise((resolve) => setTimeout(resolve, 50))

  const nullLogger = () => ({
    log: () => undefined,
    info: () => undefined,
    debug: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  })

  const requestHandledCalls = () =>
    workerLogSpy.mock.calls.filter(
      (c) => (c[0] as Record<string, unknown>).event_type === 'request.handled'
    )

  const okHandler = jest.fn(async () => new Response('ok', { status: 200 }) as NextResponse)

  beforeEach(() => {
    // Configure explicitly so the wrapper's auto-configure (env-based) is
    // skipped, and reset the insights gates mutated by previous tests.
    Honeybadger.configure({
      apiKey: 'test-api-key',
      environment: 'test',
      logger: nullLogger() as any,
      insights: { enabled: false, console: false, http: false },
    })
    Honeybadger.clear()
    // Stub the worker's queue entry point: the spy still records the merged
    // event payloads, but nothing enters the queue — otherwise the worker's
    // dispatch cooldown timer keeps the jest process alive after the run.
    workerLogSpy = jest.spyOn(eventsWorker(), 'log').mockImplementation(() => undefined)
    notifyAsyncSpy = jest.spyOn(Honeybadger, 'notifyAsync').mockResolvedValue(undefined as any)
    okHandler.mockClear()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('with insights: { enabled: true, http: true }', () => {
    beforeEach(() => {
      Honeybadger.configure({ insights: { enabled: true, http: true } })
    })

    it('emits a request.handled event with method, path, status, and duration', async () => {
      const wrapped = withHoneybadger(okHandler)
      const res = await wrapped(new Request('http://localhost:3000/api/items?secret=1'))

      expect(res.status).toBe(200)
      await waitForEvents()

      const calls = requestHandledCalls()
      expect(calls).toHaveLength(1)
      const payload = calls[0][0] as Record<string, unknown>
      expect(payload).toMatchObject({
        method: 'GET',
        path: '/api/items',
        status: 200,
      })
      expect(typeof payload.duration).toBe('number')
      expect(payload.duration as number).toBeGreaterThanOrEqual(0)
    })

    it('carries request_id/correlation_id from the request headers', async () => {
      const wrapped = withHoneybadger(okHandler)
      await wrapped(new Request('http://localhost:3000/api/items', {
        headers: { 'x-request-id': 'abc-123' },
      }))
      await waitForEvents()

      const payload = requestHandledCalls()[0][0] as Record<string, unknown>
      expect(payload.request_id).toBe('abc-123')
      expect(payload.correlation_id).toBe('abc-123')
    })

    it('uses x-correlation-id for correlation_id (distinct from request_id)', async () => {
      const wrapped = withHoneybadger(okHandler)
      await wrapped(new Request('http://localhost:3000/api/items', {
        headers: { 'x-request-id': 'req-1', 'x-correlation-id': 'trace-9' },
      }))
      await waitForEvents()

      const payload = requestHandledCalls()[0][0] as Record<string, unknown>
      expect(payload.request_id).toBe('req-1')
      expect(payload.correlation_id).toBe('trace-9')
    })

    it('generates non-empty equal ids when no headers are present', async () => {
      const wrapped = withHoneybadger(okHandler)
      await wrapped(new Request('http://localhost:3000/api/items'))
      await waitForEvents()

      const payload = requestHandledCalls()[0][0] as Record<string, unknown>
      expect(typeof payload.request_id).toBe('string')
      expect((payload.request_id as string).length).toBeGreaterThan(0)
      expect(payload.correlation_id).toBe(payload.request_id)
    })

    it('emits with status 500, notifies, and re-throws when the handler throws', async () => {
      const error = new Error('boom')
      const wrapped = withHoneybadger(async () => {
        throw error
      })

      await expect(wrapped(new Request('http://localhost:3000/api/fail'))).rejects.toThrow('boom')
      await waitForEvents()

      const calls = requestHandledCalls()
      expect(calls).toHaveLength(1)
      const payload = calls[0][0] as Record<string, unknown>
      expect(payload.status).toBe(500)
      expect(payload.path).toBe('/api/fail')
      expect(notifyAsyncSpy).toHaveBeenCalledWith(error)
    })

    it('does not emit request.handled when the first argument is not a Request', async () => {
      const wrapped = withHoneybadger(okHandler as any)
      const res = await wrapped(undefined as any)

      expect(res.status).toBe(200)
      await waitForEvents()

      expect(requestHandledCalls()).toHaveLength(0)
    })

    it('does not leak event context between concurrent requests', async () => {
      const slowHandler = async () => {
        await new Promise((resolve) => setTimeout(resolve, 20))
        return new Response('ok', { status: 200 }) as NextResponse
      }
      const wrapped = withHoneybadger(slowHandler)

      await Promise.all([1, 2].map((i) => wrapped(new Request('http://localhost:3000/api/items', {
        headers: { 'x-request-id': `rid-${i}` },
      }))))
      await waitForEvents()

      const ids = requestHandledCalls().map((c) => (c[0] as Record<string, unknown>).request_id)
      expect(ids.sort()).toEqual(['rid-1', 'rid-2'])
    })
  })

  describe('gating', () => {
    it('with default config, does not emit request.handled but programmatic events carry request_id/correlation_id', async () => {
      const wrapped = withHoneybadger(async () => {
        Honeybadger.event('custom', { msg: 'hi' })
        return new Response('ok', { status: 200 }) as NextResponse
      })

      await wrapped(new Request('http://localhost:3000/api/custom', {
        headers: { 'x-request-id': 'rid-prog' },
      }))
      await waitForEvents()

      expect(requestHandledCalls()).toHaveLength(0)

      const customCall = workerLogSpy.mock.calls.find(
        (c) => (c[0] as Record<string, unknown>).event_type === 'custom'
      )
      expect(customCall).toBeDefined()
      const payload = customCall[0] as Record<string, unknown>
      expect(payload.request_id).toBe('rid-prog')
      expect(payload.correlation_id).toBe('rid-prog')
    })

    it('with insights.http: true but insights.enabled missing (footgun), does not emit request.handled', async () => {
      Honeybadger.configure({ insights: { http: true } })
      const wrapped = withHoneybadger(okHandler)

      await wrapped(new Request('http://localhost:3000/api/items'))
      await waitForEvents()

      expect(requestHandledCalls()).toHaveLength(0)
    })

    it('with insights.enabled: false, does not emit request.handled even when insights.http is true', async () => {
      Honeybadger.configure({ insights: { enabled: false, http: true } })
      const wrapped = withHoneybadger(okHandler)

      await wrapped(new Request('http://localhost:3000/api/items'))
      await waitForEvents()

      expect(requestHandledCalls()).toHaveLength(0)
    })
  })

  describe('edge runtime fallback (no Honeybadger.run)', () => {
    let originalRun: unknown

    beforeEach(() => {
      originalRun = (Honeybadger as any).run;
      (Honeybadger as any).run = undefined
    })

    afterEach(() => {
      (Honeybadger as any).run = originalRun
    })

    it('emits request.handled with embedded ids but does not touch the shared event context', async () => {
      Honeybadger.configure({ insights: { enabled: true, http: true } })
      const setEventContextSpy = jest.spyOn(Honeybadger, 'setEventContext')
      const wrapped = withHoneybadger(okHandler)

      const res = await wrapped(new Request('http://localhost:3000/api/items', {
        headers: { 'x-request-id': 'edge-rid' },
      }))
      expect(res.status).toBe(200)
      await waitForEvents()

      expect(setEventContextSpy).not.toHaveBeenCalled()
      const calls = requestHandledCalls()
      expect(calls).toHaveLength(1)
      const payload = calls[0][0] as Record<string, unknown>
      expect(payload).toMatchObject({
        method: 'GET',
        path: '/api/items',
        status: 200,
        request_id: 'edge-rid',
        correlation_id: 'edge-rid',
      })
    })

    it('with default config, does not emit request.handled', async () => {
      const setEventContextSpy = jest.spyOn(Honeybadger, 'setEventContext')
      const wrapped = withHoneybadger(okHandler)

      const res = await wrapped(new Request('http://localhost:3000/api/items'))
      expect(res.status).toBe(200)
      await waitForEvents()

      expect(setEventContextSpy).not.toHaveBeenCalled()
      expect(requestHandledCalls()).toHaveLength(0)
    })

    it('still notifies and re-throws on error', async () => {
      const error = new Error('edge boom')
      const wrapped = withHoneybadger(async () => {
        throw error
      })

      await expect(wrapped(new Request('http://localhost:3000/api/fail'))).rejects.toThrow('edge boom')
      expect(notifyAsyncSpy).toHaveBeenCalledWith(error)
    })
  })

  describe('Next.js control-flow errors', () => {
    beforeEach(() => {
      Honeybadger.configure({ insights: { enabled: true, http: true } })
    })

    it('re-throws redirect/notFound errors without notifying or emitting an event', async () => {
      const redirect = Object.assign(new Error('NEXT_REDIRECT'), {
        digest: 'NEXT_REDIRECT;replace;/login;307;',
      })
      const wrapped = withHoneybadger(async () => {
        throw redirect
      })

      await expect(wrapped(new Request('http://localhost:3000/api/go'))).rejects.toBe(redirect)
      await waitForEvents()

      expect(notifyAsyncSpy).not.toHaveBeenCalled()
      expect(requestHandledCalls()).toHaveLength(0)
    })
  })

  describe('Pages Router API routes', () => {
    // A Pages handler is invoked as `(req, res)` with Node-style objects; the
    // status lives on `res.statusCode` rather than a returned Response.
    const makeReq = (url: string, headers: Record<string, string | string[]> = {}, method = 'GET') =>
      ({ method, url, headers }) as any
    const makeRes = (statusCode = 200) =>
      ({ statusCode, end: () => undefined, setHeader: () => undefined }) as any

    describe('with insights: { enabled: true, http: true }', () => {
      beforeEach(() => {
        Honeybadger.configure({ insights: { enabled: true, http: true } })
      })

      it('emits a request.handled event from the Node req/res pair', async () => {
        const handler = jest.fn(async (_req: any, res: any) => {
          res.statusCode = 201
        })
        const wrapped = withHoneybadger(handler)
        const res = makeRes(200)

        await wrapped(makeReq('/api/items?secret=1', { 'x-request-id': 'pg-1' }, 'POST'), res)
        await waitForEvents()

        const calls = requestHandledCalls()
        expect(calls).toHaveLength(1)
        const payload = calls[0][0] as Record<string, unknown>
        expect(payload).toMatchObject({
          method: 'POST',
          path: '/api/items',
          status: 201,
          request_id: 'pg-1',
          correlation_id: 'pg-1',
        })
        expect(typeof payload.duration).toBe('number')
      })

      it('reads ids from Node headers (array values, case-insensitive)', async () => {
        const handler = jest.fn(async (_req: any, _res: any) => undefined)
        const wrapped = withHoneybadger(handler)

        await wrapped(makeReq('/api/x', { 'X-Request-Id': ['rid-arr', 'other'] }), makeRes())
        await waitForEvents()

        const payload = requestHandledCalls()[0][0] as Record<string, unknown>
        expect(payload.request_id).toBe('rid-arr')
        expect(payload.correlation_id).toBe('rid-arr')
      })

      it('emits status 500, notifies, and re-throws when the handler throws', async () => {
        const error = new Error('pages boom')
        const wrapped = withHoneybadger(async () => {
          throw error
        })

        await expect(wrapped(makeReq('/api/fail'), makeRes())).rejects.toThrow('pages boom')
        await waitForEvents()

        const payload = requestHandledCalls()[0][0] as Record<string, unknown>
        expect(payload.status).toBe(500)
        expect(payload.path).toBe('/api/fail')
        expect(notifyAsyncSpy).toHaveBeenCalledWith(error)
      })

      it('does not leak event context between concurrent requests', async () => {
        const slowHandler = async (_req: any, res: any) => {
          await new Promise((resolve) => setTimeout(resolve, 20))
          res.statusCode = 200
        }
        const wrapped = withHoneybadger(slowHandler)

        await Promise.all(
          [1, 2].map((i) => wrapped(makeReq('/api/items', { 'x-request-id': `rid-${i}` }), makeRes()))
        )
        await waitForEvents()

        const ids = requestHandledCalls().map((c) => (c[0] as Record<string, unknown>).request_id)
        expect(ids.sort()).toEqual(['rid-1', 'rid-2'])
      })
    })

    it('with default config, does not emit request.handled', async () => {
      const handler = jest.fn(async (_req: any, _res: any) => undefined)
      const wrapped = withHoneybadger(handler)

      await wrapped(makeReq('/api/items'), makeRes())
      await waitForEvents()

      expect(requestHandledCalls()).toHaveLength(0)
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })
})

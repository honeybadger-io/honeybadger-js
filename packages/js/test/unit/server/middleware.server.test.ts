import express from 'express';
import { mock, spy } from 'sinon'
import request from 'supertest'
import Singleton from '../../../src/server';
import { nullLogger } from '../helpers';

describe('Express Middleware', function () {
  let client
  let client_mock
  const error = new Error('Badgers!')

  beforeEach(function () {
    client = Singleton.factory({
      logger: nullLogger(),
      environment: null
    })
    client_mock = mock(client)
  })

  it('is sane', function () {
    const app = express()

    app.get('/user', function (req, res) {
      res.status(200).json({ name: 'john' })
    })

    client_mock.expects('notify').never()

    return request(app)
      .get('/user')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
  })

  it('reports the error to Honeybadger and calls next error handler', function() {
    const app = express()
    const expected = spy()

    app.use(client.requestHandler)

    app.get('/', function(_req, _res) {
      throw(error)
    })

    app.use(client.errorHandler)

    app.use(function(err, _req, _res, next) {
      expected()
      next(err)
    })

    client_mock.expects('notify').once().withArgs(error)

    return request(app)
      .get('/')
      .expect(500)
      .then(() => {
        client_mock.verify()
        expect(expected.calledOnce).toBeTruthy()
      })
  })

  it('reports async errors to Honeybadger and calls next error handler', function() {
    const app = express()
    const expected = spy()

    app.use(client.requestHandler)

    app.get('/', function(_req, _res) {
      setTimeout(function asyncThrow() {
        throw(error)
      }, 0)
    })

    app.use(client.errorHandler)

    app.use(function(err, _req, _res, next) {
      expected()
      next(err)
    })

    client_mock.expects('notify').once().withArgs(error)

    return request(app)
      .get('/')
      .expect(500)
      .then(() => {
        client_mock.verify()
        expect(expected.calledOnce).toBeTruthy()
      })
  })

  it('does not leak context between requests', function() {
    const app = express()

    app.use(client.requestHandler)

    app.get('/:reqId', (req, res) => {
      const initialContext = client.__getContext();
      client.setContext({ reqId: req.params.reqId });
      setTimeout(() => {
        res.status(200).json({
          initial: initialContext,
          final: client.__getContext()
        });
      }, 500);
    });

    return Promise.all([1, 2].map((i) => {
      return request(app).get(`/${i}`)
        .expect(200)
        .then((response) => {
          const expectedContexts = { initial: {}, final: { reqId: `${i}` } }
          expect(response.body).toStrictEqual(expectedContexts)
        })
    }));
  })

  it('preserves context in the error handlers', function() {
    client.afterNotify((err, notice) => {
      expect(notice.context.reqId).toEqual(notice.message)
      expect(Object.keys(notice.context.initialContext)).toHaveLength(0)
    })

    const app = express()

    app.use(client.requestHandler)

    app.get('/:reqId', (req, _res) => {
      client.setContext({ reqId: req.params.reqId, initialContext: client.__getContext() });
      setTimeout(function asyncThrow() {
        throw new Error(req.params.reqId)
      }, 500)
    });

    app.use(client.errorHandler)

    app.use(function(_err, _req, res, _next) {
      res.status(500).json(client.__getContext());
    })

    return Promise.all([80, 90].map((i) => {
      return request(app).get(`/${i}`)
        .expect(500)
        .then((response) => {
          const expectedContext = { reqId: `${i}`, initialContext: {} }
          expect(response.body).toStrictEqual(expectedContext)
        })
    }));
  })

  describe('inbound HTTP events', function () {
    // The store is `protected` on Client; in tests we read it via `as any`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const readEventContext = (): Record<string, unknown> => (client as any).__store.getContents('eventContext')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eventsWorker = () => (client as any).__eventsWorker

    function buildApp(handler?: (req, res) => void) {
      const app = express()
      app.use(client.requestHandler)
      app.get('/ok', (req, res) => {
        if (handler) handler(req, res)
        else res.status(200).json({ ok: true })
      })
      app.get('/custom', (_req, res) => {
        client.event('custom', { msg: 'hi' })
        res.status(200).json({ ok: true })
      })
      app.get('/fail', (_req, _res) => {
        throw new Error('boom')
      })
      app.use(client.errorHandler)
      app.use(function (_err, _req, res, _next) {
        res.status(500).json({ failed: true })
      })
      return app
    }

    describe('with insights: { enabled: true, http: true }', function () {
      beforeEach(function () {
        client.configure({
          insights: { enabled: true, http: true },
        })
      })

      it('emits a request.handled event with method, path, status, and duration', function () {
        const evSpy = jest.spyOn(client, 'event')

        return request(buildApp())
          .get('/ok')
          .expect(200)
          .then(() => {
            const calls = evSpy.mock.calls.filter(c => c[0] === 'request.handled')
            expect(calls).toHaveLength(1)
            const payload = calls[0][1] as Record<string, unknown>
            expect(payload).toMatchObject({
              method: 'GET',
              path: '/ok',
              status: 200,
            })
            expect(typeof payload.duration).toBe('number')
            expect(payload.duration).toBeGreaterThanOrEqual(0)
          })
      })

      it('uses x-request-id header for request_id and falls back to it for correlation_id', function () {
        let captured: Record<string, unknown>

        return request(buildApp((_req, res) => {
          captured = readEventContext()
          res.status(200).json({ ok: true })
        }))
          .get('/ok')
          .set('x-request-id', 'abc-123')
          .expect(200)
          .then(() => {
            expect(captured.request_id).toBe('abc-123')
            expect(captured.correlation_id).toBe('abc-123')
          })
      })

      it('uses request-id header when x-request-id is absent', function () {
        let captured: Record<string, unknown>

        return request(buildApp((_req, res) => {
          captured = readEventContext()
          res.status(200).json({ ok: true })
        }))
          .get('/ok')
          .set('request-id', 'plain-456')
          .expect(200)
          .then(() => {
            expect(captured.request_id).toBe('plain-456')
            expect(captured.correlation_id).toBe('plain-456')
          })
      })

      it('uses x-correlation-id header for correlation_id (distinct from request_id)', function () {
        let captured: Record<string, unknown>

        return request(buildApp((_req, res) => {
          captured = readEventContext()
          res.status(200).json({ ok: true })
        }))
          .get('/ok')
          .set('x-request-id', 'req-1')
          .set('x-correlation-id', 'trace-9')
          .expect(200)
          .then(() => {
            expect(captured.request_id).toBe('req-1')
            expect(captured.correlation_id).toBe('trace-9')
          })
      })

      it('falls back to x-amzn-trace-id for correlation_id when x-correlation-id is absent', function () {
        let captured: Record<string, unknown>

        return request(buildApp((_req, res) => {
          captured = readEventContext()
          res.status(200).json({ ok: true })
        }))
          .get('/ok')
          .set('x-amzn-trace-id', 'Root=1-abc-def')
          .expect(200)
          .then(() => {
            expect(typeof captured.request_id).toBe('string')
            expect((captured.request_id as string).length).toBeGreaterThan(0)
            expect(captured.correlation_id).toBe('Root=1-abc-def')
            expect(captured.correlation_id).not.toBe(captured.request_id)
          })
      })

      it('generates non-empty request_id equal to correlation_id when no headers are present', function () {
        let captured: Record<string, unknown>

        return request(buildApp((_req, res) => {
          captured = readEventContext()
          res.status(200).json({ ok: true })
        }))
          .get('/ok')
          .expect(200)
          .then(() => {
            expect(typeof captured.request_id).toBe('string')
            expect((captured.request_id as string).length).toBeGreaterThan(0)
            expect(captured.correlation_id).toBe(captured.request_id)
          })
      })

      it('only emits a single request.handled event when both finish and close fire', function () {
        const evSpy = jest.spyOn(client, 'event')

        return request(buildApp((_req, res) => {
          res.once('finish', () => {
            // Simulate both terminal events firing on the same response.
            res.emit('close')
          })
          res.status(200).json({ ok: true })
        }))
          .get('/ok')
          .expect(200)
          .then(() => {
            const calls = evSpy.mock.calls.filter(c => c[0] === 'request.handled')
            expect(calls).toHaveLength(1)
          })
      })

      it('skips the request event without crashing when the response is not an EventEmitter (e.g. fastify preHandler misuse)', function () {
        const evSpy = jest.spyOn(client, 'event')
        let captured: Record<string, unknown>
        // next runs inside withRequest, so it sees the request-scoped store
        const next = jest.fn(() => { captured = readEventContext() })
        // FastifyReply-like object: carries a statusCode but has no .once
        const replyLike = { statusCode: 200 }
        const reqLike = { headers: { 'x-request-id': 'rid-not-express' }, method: 'GET', url: '/x' }

        expect(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          client.requestHandler(reqLike as any, replyLike as any, next)
        }).not.toThrow()

        expect(next).toHaveBeenCalledTimes(1)
        expect(evSpy.mock.calls.find(c => c[0] === 'request.handled')).toBeUndefined()
        // context isolation still happened: event context was seeded from headers
        expect(captured).toMatchObject({
          request_id: 'rid-not-express',
          correlation_id: 'rid-not-express',
        })
      })

      it('emits with status 500 on errors', function () {
        const evSpy = jest.spyOn(client, 'event')

        return request(buildApp())
          .get('/fail')
          .expect(500)
          .then(() => {
            const call = evSpy.mock.calls.find(c => c[0] === 'request.handled')
            expect(call).toBeDefined()
            const payload = call[1] as Record<string, unknown>
            expect(payload.status).toBe(500)
          })
      })
    })

    describe('gating', function () {
      it('with insights.http: false (default), does not emit request.handled but still seeds event context', function () {
        client.configure({
          insights: { enabled: true, http: false },
        })

        const evSpy = jest.spyOn(client, 'event')
        let captured: Record<string, unknown>

        return request(buildApp((_req, res) => {
          captured = readEventContext()
          res.status(200).json({ ok: true })
        }))
          .get('/ok')
          .set('x-request-id', 'rid-1')
          .expect(200)
          .then(() => {
            expect(evSpy.mock.calls.find(c => c[0] === 'request.handled')).toBeUndefined()
            expect(captured.request_id).toBe('rid-1')
            expect(captured.correlation_id).toBe('rid-1')
          })
      })

      it('with insights.enabled: false, does not emit request.handled but still seeds event context', function () {
        client.configure({
          insights: { enabled: false, http: true },
        })

        const evSpy = jest.spyOn(client, 'event')
        let captured: Record<string, unknown>

        return request(buildApp((_req, res) => {
          captured = readEventContext()
          res.status(200).json({ ok: true })
        }))
          .get('/ok')
          .set('x-request-id', 'rid-2')
          .expect(200)
          .then(() => {
            expect(evSpy.mock.calls.find(c => c[0] === 'request.handled')).toBeUndefined()
            expect(captured.request_id).toBe('rid-2')
          })
      })

      it('with insights.http: true but insights.enabled missing (footgun), does not emit request.handled', function () {
        client.configure({
          // intentionally omitting `enabled` — verifies the footgun is gated off
          insights: { http: true },
        })

        const evSpy = jest.spyOn(client, 'event')

        return request(buildApp())
          .get('/ok')
          .expect(200)
          .then(() => {
            expect(evSpy.mock.calls.find(c => c[0] === 'request.handled')).toBeUndefined()
          })
      })

      it('with deprecated eventsEnabled: true alone, does not emit request.handled (shim enables console, not http) but programmatic events fire', function () {
        client.configure({
          eventsEnabled: true,
        })

        const workerSpy = jest.spyOn(eventsWorker(), 'log')

        return request(buildApp())
          .get('/custom') // handler calls client.event('custom', ...)
          .expect(200)
          .then(() => new Promise((resolve) => setTimeout(resolve, 50)))
          .then(() => {
            const customCall = workerSpy.mock.calls.find(
              (c) => (c[0] as Record<string, unknown>).event_type === 'custom'
            )
            expect(customCall).toBeDefined()
            const requestHandledCall = workerSpy.mock.calls.find(
              (c) => (c[0] as Record<string, unknown>).event_type === 'request.handled'
            )
            expect(requestHandledCall).toBeUndefined()
          })
      })

      it('with insights off, programmatic events still fire and carry request_id/correlation_id', function () {
        client.configure({
          insights: { enabled: false },
        })

        const workerSpy = jest.spyOn(eventsWorker(), 'log')

        return request(buildApp())
          .get('/custom')
          .set('x-request-id', 'rid-prog')
          .expect(200)
          .then(() => new Promise((resolve) => setTimeout(resolve, 50)))
          .then(() => {
            const customCall = workerSpy.mock.calls.find(
              (c) => (c[0] as Record<string, unknown>).event_type === 'custom'
            )
            expect(customCall).toBeDefined()
            const payload = customCall[0] as Record<string, unknown>
            expect(payload.request_id).toBe('rid-prog')
            expect(payload.correlation_id).toBe('rid-prog')

            const requestExpressCall = workerSpy.mock.calls.find(
              (c) => (c[0] as Record<string, unknown>).event_type === 'request.handled'
            )
            expect(requestExpressCall).toBeUndefined()
          })
      })
    })
  })
})

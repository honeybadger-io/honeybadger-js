import Singleton from '../../../src/server'
import { nullLogger } from '../helpers'
import nock from 'nock'
import { spy } from 'sinon'
import { Types } from '@honeybadger-io/core'
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { AsyncHandler, SyncHandler } from '../../../src/server/aws_lambda'

const mockAwsEvent = (obj: Partial<APIGatewayProxyEvent> = {}) => {
  return Object.assign({}, obj) as APIGatewayProxyEvent;
}

const mockAwsContext = (obj: Partial<Context> = {}) => {
  return Object.assign({}, obj) as Context;
}

const mockAwsResult = (obj: Partial<APIGatewayProxyResult> = {}) => {
  return Object.assign({}, obj) as APIGatewayProxyResult;
}

const initNock = (expectedTimes = 1, requestBodyMatcher?: (body: {error: {message: string}}) => boolean): nock.Scope => {
  nock.cleanAll()

  return nock('https://api.honeybadger.io')
    .post('/v1/notices/js', requestBodyMatcher)
    .times(expectedTimes)
    .reply(201, '{"id":"1a327bf6-e17a-40c1-ad79-404ea1489c7a"}')
}

describe('Lambda Handler', function () {
  let client: typeof Singleton;

  beforeEach(function () {
    client = Singleton.factory({
      logger: nullLogger(),
      environment: null
    })
  })

  describe('with arguments', function () {
    const awsEvent = mockAwsEvent({ body: '1' })
    const awsContext = mockAwsContext({ awsRequestId: '2' })
    let handlerFunc;

    beforeEach(function () {
      handlerFunc = spy(() => Promise.resolve())
      const handler = client.lambdaHandler(handlerFunc) as AsyncHandler
      return handler(awsEvent, awsContext)
        .then(() => {
          return new Promise((resolve => {
            process.nextTick(function () {
              resolve(true)
            })
          }))
        })
    })

    it('calls original handler with arguments', function () {
      expect(handlerFunc.lastCall.args.length).toBe(2)
      expect(handlerFunc.lastCall.args[0]).toBe(awsEvent)
      expect(handlerFunc.lastCall.args[1]).toBe(awsContext)
    })
  })

  describe('async handlers', function () {

    it('calls handler with asynchronous response if no error is thrown', async function () {
      client.configure({
        apiKey: 'testing'
      })

      const handler = client.lambdaHandler(async function (_event, _context) {
        return Promise.resolve(mockAwsResult({ body: 'works!' }))
      }) as AsyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

      const res = await handler(mockAwsEvent(), mockAwsContext())
      expect(res).toBeDefined()
      expect(res.body).toEqual('works!')
    })

    it('calls handler with synchronous response if no error is thrown', async function () {
      client.configure({
        apiKey: 'testing'
      })

      const handler = client.lambdaHandler(async function (_event, _context) {
        return mockAwsResult({ body: 'works!' })
      }) as AsyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

      const res = await handler(mockAwsEvent(), mockAwsContext())
      expect(res).toBeDefined()
      expect(res.body).toEqual('works!')
    })

    it('calls sync handler with synchronous response if no error is thrown', async function () {
      client.configure({
        apiKey: 'testing'
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handler = client.lambdaHandler(<any>function (_event, _context) {
        return mockAwsResult({ body: 'works!' })
      }) as AsyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

      const res = await handler(mockAwsEvent(), mockAwsContext())
      expect(res).toBeDefined()
      expect(res.body).toEqual('works!')
    })

    it('calls handler if notify exits on preconditions', async function () {
      client.configure({
        apiKey: null
      })

      // @ts-expect-error
      const handler = client.lambdaHandler(async function (_event, _context) {
        throw new Error('Badgers!')
      }) as AsyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

      return expect(handler(mockAwsEvent(), mockAwsContext())).rejects.toEqual(new Error('Badgers!'))
    })

    it('reports errors to Honeybadger', async function () {
      client.configure({
        apiKey: 'testing'
      })
      const api = initNock()
      // @ts-expect-error
      const handler = client.lambdaHandler(async function (_event) {
        throw new Error('Badgers!')
      }) as AsyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

      try {
        await handler(mockAwsEvent(), mockAwsContext())
      } catch (e) {
        expect(e).toEqual(new Error('Badgers!'))
      }

      return new Promise<void>(resolve => {
        setTimeout(() => {
          api.done()
          resolve()
        }, 50)
      })
    })

    it('reports async errors to Honeybadger', async function () {
      client.configure({
        apiKey: 'testing'
      })
      const api = initNock()
      const handler = client.lambdaHandler(async function (_event) {
        return new Promise<APIGatewayProxyResult>((resolve, reject) => {
          setTimeout(function () {
            reject(new Error('Badgers!'))
          }, 0)
        })
      }) as AsyncHandler

      try {
        await handler(mockAwsEvent(), mockAwsContext())
      } catch (e) {
        expect(e).toEqual(new Error('Badgers!'))
      }

      return new Promise<void>(resolve => {
        setTimeout(() => {
          api.done()
          resolve()
        }, 50)
      })
    })

    it('reports timeout warning to Honeybadger by default', async function () {
      const REMAINING_TIME_MS = 200
      const TIMEOUT_THRESHOLD_MS = 50 // default
      const SHOULD_BE_CALLED_AFTER_MS = REMAINING_TIME_MS - TIMEOUT_THRESHOLD_MS

      client.configure({
        apiKey: 'testing',
      })

      let noticeSentAt: number
      const api = initNock(1, (body) => {
        noticeSentAt = Date.now()
        return body.error.message === 'serverlessFunction[v1.0.0] may have timed out'
      })
      const handler = client.lambdaHandler(async function (_event) {
        return new Promise<APIGatewayProxyResult>((resolve, _reject) => {
          setTimeout(function () {
            resolve({ body: 'should not resolve', statusCode: 200 })
          }, REMAINING_TIME_MS * 2)
        })
      }) as AsyncHandler

      const handlerCalledAt = Date.now()
      let handlerResolvedAt: number
      handler(mockAwsEvent(), mockAwsContext({
        functionName: 'serverlessFunction',
        functionVersion: 'v1.0.0',
        getRemainingTimeInMillis: () => REMAINING_TIME_MS
      }))
        .then(() => {
          handlerResolvedAt = Date.now()
        })

      return new Promise<void>(resolve => {
        setTimeout(() => {
          if (handlerResolvedAt) {
            expect(noticeSentAt).toBeLessThan(handlerResolvedAt)
          }
          // let a 100ms window because setTimeout cannot guarantee exact execution at specified interval
          expect(noticeSentAt - handlerCalledAt).toBeLessThan(SHOULD_BE_CALLED_AFTER_MS + 100)
          api.done()
          resolve()
        }, SHOULD_BE_CALLED_AFTER_MS + 150)
      })
    })

    it('reports timeout warning to Honeybadger with custom timeout threshold', async function () {
      const REMAINING_TIME_MS = 2000
      const TIMEOUT_THRESHOLD_MS = 1000
      const SHOULD_BE_CALLED_AFTER_MS = REMAINING_TIME_MS - TIMEOUT_THRESHOLD_MS

      client.configure({
        apiKey: 'testing',
        timeoutWarningThresholdMs: TIMEOUT_THRESHOLD_MS
      })

      let noticeSentAt: number
      const api = initNock(1, (body) => {
        noticeSentAt = Date.now()
        return body.error.message === 'serverlessFunction[v1.0.0] may have timed out'
      })
      const handler = client.lambdaHandler(async function (_event) {
        return new Promise<APIGatewayProxyResult>((resolve, _reject) => {
          setTimeout(function () {
            resolve({ body: 'should not resolve', statusCode: 200 })
          }, REMAINING_TIME_MS * 2)
        })
      }) as AsyncHandler

      const handlerCalledAt = Date.now()
      let handlerResolvedAt: number
      handler(mockAwsEvent(), mockAwsContext({
        functionName: 'serverlessFunction',
        functionVersion: 'v1.0.0',
        getRemainingTimeInMillis: () => REMAINING_TIME_MS
      }))
        .then(() => {
          handlerResolvedAt = Date.now()
        })

      return new Promise<void>(resolve => {
        setTimeout(() => {
          if (handlerResolvedAt) {
            expect(noticeSentAt).toBeLessThan(handlerResolvedAt)
          }
          // let a 100ms window because setTimeout cannot guarantee exact execution at specified interval
          expect(noticeSentAt - handlerCalledAt).toBeLessThan(SHOULD_BE_CALLED_AFTER_MS + 100)
          api.done()
          resolve()
        }, SHOULD_BE_CALLED_AFTER_MS + 150)
      })
    })

    it('does not report timeout warning to Honeybadger', async function () {
      const REMAINING_TIME_MS = 100
      const HANDLER_RESOLVE_AFTER_MS = 200

      client.configure({
        apiKey: 'testing',
        reportTimeoutWarning: false
      })

      const api = initNock()

      const handler = client.lambdaHandler(async function (_event) {
        return new Promise<APIGatewayProxyResult>((resolve, _reject) => {
          setTimeout(function () {
            resolve({ body: 'should resolve', statusCode: 200 })
          }, HANDLER_RESOLVE_AFTER_MS)
        })
      }) as AsyncHandler

      const handlerCalledAt = Date.now()
      const result = await handler(mockAwsEvent(), mockAwsContext({
        functionName: 'serverlessFunction',
        functionVersion: 'v1.0.0',
        getRemainingTimeInMillis: () => REMAINING_TIME_MS
      }))
      const handlerResolvedAt = Date.now()

      expect(result.statusCode).toEqual(200)
      expect(handlerResolvedAt - handlerCalledAt).toBeLessThan(HANDLER_RESOLVE_AFTER_MS + 50)
      expect(api.isDone()).toBe(false)
    })

    it('does not report timeout warning if function resolves', async function () {
      const REMAINING_TIME_MS = 200
      const TIMEOUT_THRESHOLD_MS = 50 // default
      const SHOULD_BE_CALLED_AFTER_MS = REMAINING_TIME_MS - TIMEOUT_THRESHOLD_MS

      client.configure({
        apiKey: 'testing',
      })

      let noticeSentAt: number
      const api = initNock(1, (body) => {
        noticeSentAt = Date.now()
        return body.error.message === 'serverlessFunction[v1.0.0] may have timed out'
      })
      const handler = client.lambdaHandler(async function (_event) {
        return new Promise<APIGatewayProxyResult>((resolve, _reject) => {
          setTimeout(function () {
            resolve({ body: 'should resolve', statusCode: 200 })
          }, REMAINING_TIME_MS / 2)
        })
      }) as AsyncHandler

      const handlerCalledAt = Date.now()
      let handlerResolvedAt: number
      handler(mockAwsEvent(), mockAwsContext({
        functionName: 'serverlessFunction',
        functionVersion: 'v1.0.0',
        getRemainingTimeInMillis: () => REMAINING_TIME_MS
      }))
        .then(() => {
          handlerResolvedAt = Date.now()
        })

      return new Promise<void>(resolve => {
        setTimeout(() => {
          expect(handlerResolvedAt).toBeGreaterThan(handlerCalledAt)
          expect(noticeSentAt).toBeUndefined()
          expect(api.isDone()).toEqual(false)
          resolve()
        }, SHOULD_BE_CALLED_AFTER_MS + 150)
      })
    })
  })

  describe('non-async handlers', function () {

    beforeEach(function () {
      client.configure({
        apiKey: 'testing'
      })
    })

    it('calls handler if no error is thrown', function () {
      return new Promise((done) => {
        const handler = client.lambdaHandler(function (_event, _context, callback) {
          callback(null, mockAwsResult({ body: 'works!' }))
        }) as SyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

        handler(mockAwsEvent(), mockAwsContext(), (err, res) => {
          expect(res).toBeDefined()
          expect(res.body).toEqual('works!')
          done(err)
        })
      })
    })

    it('calls handler if notify exits on preconditions', function () {
      return new Promise((done) => {
        client.configure({
          apiKey: null
        })

        const handler = client.lambdaHandler(function (_event, _context, _callback) {
          throw new Error('Badgers!')
        }) as SyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

        handler(mockAwsEvent(), mockAwsContext(), (err, _res) => {
          expect(err).toEqual(new Error('Badgers!'))
          done(null)
        })
      })
    })

    it('reports errors to Honeybadger', function () {
      const api = initNock()

      const handler = client.lambdaHandler(function (_event, _context, _callback) {
        throw new Error('Badgers!')
      }) as SyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

      return new Promise(done => {
        handler(mockAwsEvent(), mockAwsContext(), (err, _res) => {
          expect(err).toEqual(new Error('Badgers!'))
          setTimeout(() => {
            api.done()
            done(null)
          }, 50)
        })
      })
    })

    it('reports async errors to Honeybadger', function () {
      const api = initNock()

      const handler = client.lambdaHandler(function (_event, _context, callback) {
        setTimeout(function () {
          callback(new Error('Badgers!'))
        }, 0)
      }) as SyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

      return new Promise(done => {
        handler(mockAwsEvent(), mockAwsContext(), (err, _res) => {
          expect(err).toEqual(new Error('Badgers!'))
          setTimeout(() => {
            api.done()
            done(null)
          }, 50)
        })
      })
    })

    it('calls beforeNotify and afterNotify handlers', function () {
      const api = initNock()

      const handler = client.lambdaHandler(function (_event, _context, callback) {
        setTimeout(function () {
          callback(new Error('Badgers!'))
        }, 0)
      }) as SyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

      client.beforeNotify(function (notice: Types.Notice) {
        notice.context = Object.assign(notice.context, { foo: 'bar' })
      })

      let afterNotifyCalled = false;
      client.afterNotify(function (err: Error | undefined, notice: Types.Notice) {
        expect(notice.context).toEqual({ foo: 'bar' })
        afterNotifyCalled = true;
      })

      return new Promise(done => {
        handler(mockAwsEvent(), mockAwsContext(), (err, _res) => {
          expect(err).toEqual(new Error('Badgers!'))
          setTimeout(() => {
            api.done()
            expect(afterNotifyCalled).toBeTruthy()
            done(null)
          }, 50)
        })
      })
    })

    it('reports timeout warning to Honeybadger', async function () {
      const REMAINING_TIME_MS = 200
      const TIMEOUT_THRESHOLD_MS = 50 // default
      const SHOULD_BE_CALLED_AFTER_MS = REMAINING_TIME_MS - TIMEOUT_THRESHOLD_MS

      let noticeSentAt: number
      const api = initNock(1, (body) => {
        noticeSentAt = Date.now()
        return body.error.message === 'serverlessFunction[v1.0.0] may have timed out'
      })

      const handler = client.lambdaHandler(function (_event, _context, callback) {
        setTimeout(function () {
          callback(null, { body: 'should not resolve', statusCode: 200 })
        }, REMAINING_TIME_MS * 2)
      }) as SyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

      return new Promise<void>((resolve) => {
        const handlerCalledAt = Date.now()
        let handlerResolvedAt: number
        handler(mockAwsEvent(), mockAwsContext(mockAwsContext({
          functionName: 'serverlessFunction',
          functionVersion: 'v1.0.0',
          getRemainingTimeInMillis: () => REMAINING_TIME_MS
        })), (_err, _res) => {
          handlerResolvedAt = Date.now()
        })
        setTimeout(() => {
          if (handlerResolvedAt) {
            expect(noticeSentAt).toBeLessThan(handlerResolvedAt)
          }
          // let a 100ms window because setTimeout cannot guarantee exact execution at specified interval
          expect(noticeSentAt - handlerCalledAt).toBeLessThan(SHOULD_BE_CALLED_AFTER_MS + 100)
          api.done()
          resolve()
        }, SHOULD_BE_CALLED_AFTER_MS + 150)
      })
    })

    it('reports timeout warning to Honeybadger with custom timeout threshold', async function () {
      const REMAINING_TIME_MS = 2000
      const TIMEOUT_THRESHOLD_MS = 1000 // default
      const SHOULD_BE_CALLED_AFTER_MS = REMAINING_TIME_MS - TIMEOUT_THRESHOLD_MS

      client.configure({
        timeoutWarningThresholdMs: TIMEOUT_THRESHOLD_MS
      })

      let noticeSentAt: number
      const api = initNock(1, (body) => {
        noticeSentAt = Date.now()
        return body.error.message === 'serverlessFunction[v1.0.0] may have timed out'
      })

      const handler = client.lambdaHandler(function (_event, _context, callback) {
        setTimeout(function () {
          callback(null, { body: 'should not resolve', statusCode: 200 })
        }, REMAINING_TIME_MS * 2)
      }) as SyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

      return new Promise<void>((resolve) => {
        const handlerCalledAt = Date.now()
        let handlerResolvedAt: number
        handler(mockAwsEvent(), mockAwsContext(mockAwsContext({
          functionName: 'serverlessFunction',
          functionVersion: 'v1.0.0',
          getRemainingTimeInMillis: () => REMAINING_TIME_MS
        })), (_err, _res) => {
          handlerResolvedAt = Date.now()
        })
        setTimeout(() => {
          if (handlerResolvedAt) {
            expect(noticeSentAt).toBeLessThan(handlerResolvedAt)
          }
          // let a 100ms window because setTimeout cannot guarantee exact execution at specified interval
          expect(noticeSentAt - handlerCalledAt).toBeLessThan(SHOULD_BE_CALLED_AFTER_MS + 100)
          api.done()
          resolve()
        }, SHOULD_BE_CALLED_AFTER_MS + 150)
      })
    })

    it('does not report timeout warning to Honeybadger', async function () {
      const REMAINING_TIME_MS = 100
      const HANDLER_RESOLVE_AFTER_MS = 200

      client.configure({
        reportTimeoutWarning: false
      })

      const api = initNock()

      const handler = client.lambdaHandler(function (_event, _context, callback) {
        setTimeout(function () {
          callback(null, { body: 'should resolve', statusCode: 200 })
        }, HANDLER_RESOLVE_AFTER_MS)
      }) as SyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

      return new Promise<void>(resolve => {
        const handlerCalledAt = Date.now()
        handler(mockAwsEvent(), mockAwsContext({
          functionName: 'serverlessFunction',
          functionVersion: 'v1.0.0',
          getRemainingTimeInMillis: () => REMAINING_TIME_MS
        }), (err, result) => {
          const handlerResolvedAt = Date.now()
          expect(err).toBeNull()
          expect(result.statusCode).toEqual(200)
          expect(handlerResolvedAt - handlerCalledAt).toBeLessThan(HANDLER_RESOLVE_AFTER_MS + 50)
          expect(api.isDone()).toBe(false)
          resolve()
        })
      })
    })

    it('does not report timeout warning if function resolves', async function () {
      const REMAINING_TIME_MS = 200
      const TIMEOUT_THRESHOLD_MS = 50 // default
      const SHOULD_BE_CALLED_AFTER_MS = REMAINING_TIME_MS - TIMEOUT_THRESHOLD_MS

      let noticeSentAt: number
      const api = initNock(1, (body) => {
        noticeSentAt = Date.now()
        return body.error.message === 'serverlessFunction[v1.0.0] may have timed out'
      })

      const handler = client.lambdaHandler(function (_event, _context, callback) {
        setTimeout(function () {
          callback(null, { body: 'should resolve', statusCode: 200 })
        }, REMAINING_TIME_MS / 2)
      }) as SyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

      return new Promise<void>((resolve) => {
        const handlerCalledAt = Date.now()
        let handlerResolvedAt: number
        handler(mockAwsEvent(), mockAwsContext(mockAwsContext({
          functionName: 'serverlessFunction',
          functionVersion: 'v1.0.0',
          getRemainingTimeInMillis: () => REMAINING_TIME_MS
        })), (_err, _res) => {
          handlerResolvedAt = Date.now()
        })
        setTimeout(() => {
          expect(handlerResolvedAt).toBeGreaterThan(handlerCalledAt)
          expect(noticeSentAt).toBeUndefined()
          expect(api.isDone()).toEqual(false)
          resolve()
        }, SHOULD_BE_CALLED_AFTER_MS + 150)
      })
    })
  })

  describe('inbound HTTP events', function () {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const readEventContext = (): Record<string, unknown> => (client as any).__store.getContents('eventContext')

    beforeEach(function () {
      // Silently swallow the events worker's POSTs so unmatched-host nock
      // interceptors from earlier tests don't surface as console noise.
      nock('https://api.honeybadger.io').persist().post('/v1/events').reply(201, '')
    })

    const apiGatewayV2Event = (headers: Record<string, string> = {}) => ({
      headers,
      requestContext: { http: { method: 'GET', path: '/users' } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const apiGatewayV1Event = (headers: Record<string, string> = {}) => ({
      headers,
      httpMethod: 'POST',
      path: '/items',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    // SQS-like trigger has no method/path/headers.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sqsEvent = () => ({ Records: [{ messageId: 'm-1', body: 'hello' }] } as any)

    const ctx = (awsRequestId = 'aws-req-1') => mockAwsContext({ awsRequestId })

    describe('with eventsEnabled: true, insights: { enabled: true, http: true }', function () {
      beforeEach(function () {
        client.configure({
          apiKey: 'testing',
          eventsEnabled: true,
          insights: { enabled: true, http: true },
        })
      })

      it('emits request.handled for API Gateway v2 with method, path, status, duration', async function () {
        const evSpy = jest.spyOn(client, 'event')
        const handler = client.lambdaHandler(async () => ({ statusCode: 201, body: 'ok' })) as AsyncHandler

        await handler(apiGatewayV2Event(), ctx())

        const call = evSpy.mock.calls.find(c => c[0] === 'request.handled')
        expect(call).toBeDefined()
        const payload = call[1] as Record<string, unknown>
        expect(payload).toMatchObject({ method: 'GET', path: '/users', status: 201 })
        expect(typeof payload.duration).toBe('number')
        expect(payload.duration).toBeGreaterThanOrEqual(0)
      })

      it('emits request.handled for API Gateway v1 with httpMethod and path', async function () {
        const evSpy = jest.spyOn(client, 'event')
        const handler = client.lambdaHandler(async () => ({ statusCode: 200 })) as AsyncHandler

        await handler(apiGatewayV1Event(), ctx())

        const call = evSpy.mock.calls.find(c => c[0] === 'request.handled')
        expect(call).toBeDefined()
        const payload = call[1] as Record<string, unknown>
        expect(payload).toMatchObject({ method: 'POST', path: '/items', status: 200 })
      })

      it('defaults status to 200 when the handler result omits statusCode', async function () {
        const evSpy = jest.spyOn(client, 'event')
        const handler = client.lambdaHandler(async () => ({ body: 'no status' })) as AsyncHandler

        await handler(apiGatewayV2Event(), ctx())

        const call = evSpy.mock.calls.find(c => c[0] === 'request.handled')
        expect((call[1] as Record<string, unknown>).status).toBe(200)
      })

      it('emits request.handled with status 500 when an async handler rejects', async function () {
        client.configure({ apiKey: null }) // skip the actual notify network call
        const evSpy = jest.spyOn(client, 'event')
        // @ts-expect-error handler that always throws is inferred as Promise<never>
        const handler = client.lambdaHandler(async () => {
          throw new Error('boom')
        }) as AsyncHandler

        await expect(handler(apiGatewayV2Event(), ctx())).rejects.toEqual(new Error('boom'))

        const call = evSpy.mock.calls.find(c => c[0] === 'request.handled')
        expect(call).toBeDefined()
        expect((call[1] as Record<string, unknown>).status).toBe(500)
      })

      it('emits request.handled with status 500 when a sync handler errors via callback', function () {
        client.configure({ apiKey: null })
        const evSpy = jest.spyOn(client, 'event')
        const handler = client.lambdaHandler(function (_event, _context, callback) {
          callback(new Error('sync-boom'))
        }) as SyncHandler

        return new Promise<void>((done) => {
          handler(apiGatewayV1Event(), ctx(), () => {
            const call = evSpy.mock.calls.find(c => c[0] === 'request.handled')
            expect(call).toBeDefined()
            expect((call[1] as Record<string, unknown>).status).toBe(500)
            done()
          })
        })
      })

      it('uses x-request-id header for requestId and falls back to it for correlationId', async function () {
        let captured: Record<string, unknown>
        const handler = client.lambdaHandler(async () => {
          captured = readEventContext()
          return { statusCode: 200 }
        }) as AsyncHandler

        await handler(apiGatewayV2Event({ 'x-request-id': 'hdr-1' }), ctx())

        expect(captured.requestId).toBe('hdr-1')
        expect(captured.correlationId).toBe('hdr-1')
      })

      it('uses x-correlation-id when distinct from x-request-id', async function () {
        let captured: Record<string, unknown>
        const handler = client.lambdaHandler(async () => {
          captured = readEventContext()
          return { statusCode: 200 }
        }) as AsyncHandler

        await handler(apiGatewayV2Event({
          'x-request-id': 'req-1',
          'x-correlation-id': 'trace-9',
        }), ctx())

        expect(captured.requestId).toBe('req-1')
        expect(captured.correlationId).toBe('trace-9')
      })

      it('emits once even if both success and finalize paths could fire', async function () {
        const evSpy = jest.spyOn(client, 'event')
        const handler = client.lambdaHandler(async () => ({ statusCode: 200 })) as AsyncHandler

        await handler(apiGatewayV2Event(), ctx())

        const calls = evSpy.mock.calls.filter(c => c[0] === 'request.handled')
        expect(calls).toHaveLength(1)
      })
    })

    describe('non-HTTP triggers', function () {
      beforeEach(function () {
        client.configure({
          apiKey: 'testing',
          eventsEnabled: true,
          insights: { enabled: true, http: true },
        })
      })

      it('does not emit request.handled but seeds eventContext from awsRequestId', async function () {
        const evSpy = jest.spyOn(client, 'event')
        let captured: Record<string, unknown>
        const handler = client.lambdaHandler(async () => {
          captured = readEventContext()
          return { ok: true }
        }) as AsyncHandler

        await handler(sqsEvent(), ctx('lambda-invocation-42'))

        expect(evSpy.mock.calls.find(c => c[0] === 'request.handled')).toBeUndefined()
        expect(captured.requestId).toBe('lambda-invocation-42')
        expect(captured.correlationId).toBe('lambda-invocation-42')
      })

      it('uses _X_AMZN_TRACE_ID env var as correlationId when present', async function () {
        const prev = process.env._X_AMZN_TRACE_ID
        process.env._X_AMZN_TRACE_ID = 'Root=1-trace-xyz'
        try {
          let captured: Record<string, unknown>
          const handler = client.lambdaHandler(async () => {
            captured = readEventContext()
            return { ok: true }
          }) as AsyncHandler

          await handler(sqsEvent(), ctx('aws-id-7'))

          expect(captured.requestId).toBe('aws-id-7')
          expect(captured.correlationId).toBe('Root=1-trace-xyz')
        } finally {
          if (prev === undefined) delete process.env._X_AMZN_TRACE_ID
          else process.env._X_AMZN_TRACE_ID = prev
        }
      })
    })

    describe('gating', function () {
      it('with insights.http: false, does not emit but still seeds eventContext from headers', async function () {
        client.configure({
          apiKey: 'testing',
          eventsEnabled: true,
          insights: { enabled: true, http: false },
        })

        const evSpy = jest.spyOn(client, 'event')
        let captured: Record<string, unknown>
        const handler = client.lambdaHandler(async () => {
          captured = readEventContext()
          return { statusCode: 200 }
        }) as AsyncHandler

        await handler(apiGatewayV2Event({ 'x-request-id': 'rid-1' }), ctx())

        expect(evSpy.mock.calls.find(c => c[0] === 'request.handled')).toBeUndefined()
        expect(captured.requestId).toBe('rid-1')
        expect(captured.correlationId).toBe('rid-1')
      })

      it('with insights.enabled: false, does not emit even if http: true', async function () {
        client.configure({
          apiKey: 'testing',
          eventsEnabled: true,
          insights: { enabled: false, http: true },
        })

        const evSpy = jest.spyOn(client, 'event')
        const handler = client.lambdaHandler(async () => ({ statusCode: 200 })) as AsyncHandler

        await handler(apiGatewayV2Event(), ctx())

        expect(evSpy.mock.calls.find(c => c[0] === 'request.handled')).toBeUndefined()
      })

      it('with eventsEnabled: false, drops everything including request.handled', async function () {
        client.configure({
          apiKey: 'testing',
          eventsEnabled: false,
          insights: { enabled: true, http: true },
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const workerSpy = jest.spyOn((client as any).__eventsWorker, 'log')
        const handler = client.lambdaHandler(async () => ({ statusCode: 200 })) as AsyncHandler

        await handler(apiGatewayV2Event(), ctx())
        await new Promise((r) => setTimeout(r, 30))

        expect(workerSpy).not.toHaveBeenCalled()
      })
    })
  })
})

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

const initNock = (expectedTimes = 1, requestBodyMatcher?: (body: {error: {message:string}}) => boolean): nock.Scope => {
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
})

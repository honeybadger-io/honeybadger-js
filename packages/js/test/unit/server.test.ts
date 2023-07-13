import { Client as BaseClient } from '@honeybadger-io/core'
import nock from 'nock'
import Singleton from '../../src/server'
import { nullLogger } from './helpers'

describe('server client', function () {
  let client: typeof Singleton

  beforeEach(function () {
    client = Singleton.factory({
      logger: nullLogger(),
      environment: null,
    })
  })

  it('inherits from base client', function () {
    expect(client).toEqual(expect.any(BaseClient))
  })

  it('sets the default hostname', function () {
    expect(client.config.hostname).toEqual(expect.any(String))
  })

  it('reports an error over https by default', function () {
    client.configure({
      apiKey: 'testing'
    })

    const request = nock('https://api.honeybadger.io')
      .post('/v1/notices/js')
      .reply(201, {
        id: '48b98609-dd3b-48ee-bffc-d51f309a2dfa'
      })

    return new Promise(resolve => {
      client.afterNotify(function (_err, _notice) {
        expect(request.isDone()).toBe(true)
        resolve(true)
      })
      client.notify('testing')
    })
  })

  it('reports an error over http when configured', function () {
    client.configure({
      apiKey: 'testing',
      endpoint: 'http://api.honeybadger.io'
    })

    const request = nock('http://api.honeybadger.io')
      .post('/v1/notices/js')
      .reply(201, {
        id: '48b98609-dd3b-48ee-bffc-d51f309a2dfa'
      })

    return new Promise(resolve => {
      client.afterNotify(function (_err, _notice) {
        expect(request.isDone()).toBe(true)
        resolve(true)
      })
      client.notify('testing')
    })
  })

  it('flags app lines in the backtrace', function () {
    client.configure({
      apiKey: 'testing'
    })

    nock('https://api.honeybadger.io')
      .post('/v1/notices/js')
      .reply(201, {
        id: '48b98609-dd3b-48ee-bffc-d51f309a2dfa'
      })

    return new Promise(resolve => {
      client.notify('testing', {
        afterNotify: (err, notice) => {
          expect(err).toBeUndefined()
          expect(notice.message).toEqual('testing')
          expect(notice.backtrace[0].file).toMatch('[PROJECT_ROOT]')
          resolve(true)
        }
      })
    })
  })

  it('combines previous global state when reporting', function () {
    let expectedAssertions = 2; // Safeguard to ensure all handlers are called

    client.addBreadcrumb('global 1')
    client.addBreadcrumb('global 2')
    const req1 = {}
    const req2 = {}
    client.withRequest(req1, () => {
      client.addBreadcrumb('async 1 from request 1')
    })
    client.withRequest(req2, () => {
      client.addBreadcrumb('async 1 from request 2')
      expect(client.__getBreadcrumbs()).toHaveLength(3)
      expect(client.__getBreadcrumbs().map(({ message }) => message)).toEqual(
        ['global 1', 'global 2', 'async 1 from request 2']
      )
      expectedAssertions--
    })
    client.withRequest(req1, () => {
      client.addBreadcrumb('async 2 from request 1')
      expect(client.__getBreadcrumbs()).toHaveLength(4)
      expect(client.__getBreadcrumbs().map(({ message }) => message)).toEqual(
        ['global 1', 'global 2', 'async 1 from request 1', 'async 2 from request 1']
      )
      expectedAssertions--
    })

    client.addBreadcrumb('global 3')
    expect(client.__getBreadcrumbs()).toHaveLength(3)
    expect(client.__getBreadcrumbs().map(({ message }) => message)).toEqual(
      ['global 1', 'global 2', 'global 3']
    )

    if (expectedAssertions !== 0) {
      throw new Error(`Not all assertions ran. ${expectedAssertions} assertions did not run.`)
    }
  })

  it('uses the correct notifier name', function () {
    expect(client.getNotifier().name).toEqual('@honeybadger-io/js')
  })

  describe('afterNotify', function () {
    beforeEach(function () {
      client.configure({
        apiKey: 'testing'
      })
    })

    it('is called without an error when the request succeeds', function () {
      const id = '48b98609-dd3b-48ee-bffc-d51f309a2dfa'
      nock('https://api.honeybadger.io')
        .post('/v1/notices/js')
        .reply(201, {
          id: id
        })

      return new Promise(resolve => {
        client.afterNotify(function (err, notice) {
          expect(err).toBeUndefined()
          expect(notice.message).toEqual('testing')
          expect(notice.id).toBe(id)
          resolve(true)
        })
        client.notify('testing')
      })
    })

    it('is called with an error when the request fails', function () {
      nock('https://api.honeybadger.io')
        .post('/v1/notices/js')
        .reply(403)

      return new Promise(resolve => {
        client.afterNotify(function (err, notice) {
          expect(notice.message).toEqual('testing')
          expect(err.message).toMatch(/403/)
          resolve(true)
        })
        client.notify('testing')
      })
    })

    it('is called without an error when passed as an option and the request succeeds', function () {
      const id = '48b98609-dd3b-48ee-bffc-d51f309a2dfa'
      nock('https://api.honeybadger.io')
        .post('/v1/notices/js')
        .reply(201, {
          id: id
        })

      return new Promise(resolve => {
        client.notify('testing', {
          afterNotify: (err, notice) => {
            expect(err).toBeUndefined()
            expect(notice.message).toEqual('testing')
            expect(notice.id).toBe(id)
            resolve(true)
          }
        })
      })
    })

    it('is called with an error when passed as an option and the request fails', function () {
      nock('https://api.honeybadger.io')
        .post('/v1/notices/js')
        .reply(403)

      return new Promise(resolve => {
        client.notify('testing', {
          afterNotify: (err, notice) => {
            expect(notice.message).toEqual('testing')
            expect(err.message).toMatch(/403/)
            resolve(true)
          }
        })
      })
    })
  })

  describe('notifyAsync', function () {
    beforeEach(() => {
      client.configure({
        apiKey: 'testing'
      })
    })

    it('resolves after the http request is done', async () => {
      const request = nock('https://api.honeybadger.io')
        .post('/v1/notices/js')
        .reply(201, {
          id: '48b98609-dd3b-48ee-bffc-d51f309a2dfa'
        })

      await client.notifyAsync('testing')
      expect(request.isDone()).toBe(true)
    })

    it('rejects on http error', async () => {
      const request = nock('https://api.honeybadger.io')
        .post('/v1/notices/js')
        .reply(400)

      await expect(client.notifyAsync('testing')).rejects.toThrow(/Bad HTTP response/)
      expect(request.isDone()).toBe(true)
    })
  })

  describe('withRequest', function () {
    beforeEach(() => {
      client.configure({
        apiKey: 'testing'
      })
    })

    // eslint-disable-next-line
    it('captures errors in timers with the right context', (done) => {
      let context, err;
      const errorHandler = (e) => {
        err = e;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        context = (<any>client).__getContext();
      }

      client.withRequest({}, () => client.setContext({ a: true }), errorHandler)
      client.withRequest({}, () => {
        client.setContext({ b: true })
        setTimeout(() => { throw new Error('Oh no') }, 10)
      }, errorHandler)

      setTimeout(() => {
        expect(err.message).toStrictEqual('Oh no');
        expect(context).toStrictEqual({ b: true });
        done();
      }, 20);
    });

    // eslint-disable-next-line
    it('retrieves context from the same request object', (done) => {
      const request = {};

      client.withRequest(request, () => {
        client.setContext({ request1: true })
      });
      client.withRequest(request, () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((<any>client).__getContext()).toStrictEqual({ request1: true });
      });
      client.withRequest(request, () => {
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          expect((<any>client).__getContext()).toStrictEqual({ request1: true });
          done();
        }, 200);
      });
    });
  })

  describe('checkIn', function () {
    it('sends a checkIn report', async function () {
      client.configure({
        apiKey: 'testing',
        endpoint: 'http://api.honeybadger.io'
      })

      const checkInId = '123'
      const request = nock('http://api.honeybadger.io')
        .get(`/v1/check_in/${checkInId}`)
        .reply(201)

      await client.checkIn(checkInId)
      expect(request.isDone()).toBe(true)
    })
  })
})

import { Client as BaseClient } from '@honeybadger-io/core'
import os from 'os';
import nock from 'nock'
import Singleton from '../../src/server'
import { nullLogger } from './helpers'
import { CheckInDto } from '../../src/server/check-ins-manager/types';

describe('server client', function () {
  let client: typeof Singleton

  beforeEach(function () {
    client = Singleton.factory({
      logger: nullLogger(),
      environment: null,
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('configuration', function () {

    const CONFIG_FROM_FILE = {
      apiKey: 'testing',
      personalAuthToken: 'p123',
      environment: 'staging',
      developmentEnvironments: ['staging', 'dev', 'local'],
      tags: ['tag-1', 'tag-2'],
      checkins: [
        {
          projectId: '11111',
          name: 'a check-in',
          scheduleType: 'simple',
          reportPeriod: '1 week',
          gracePeriod: '5 minutes'
        }
      ]
    }

    it('creates a client with default configuration', function () {
      const client = Singleton.factory()
      expect(client.config).toMatchObject({
        apiKey: null,
        endpoint: 'https://api.honeybadger.io',
        environment: null,
        projectRoot: process.cwd(),
        hostname: os.hostname(),
        component: null,
        action: null,
        revision: null,
        reportData: null,
        breadcrumbsEnabled: true,
        maxBreadcrumbs: 40,
        maxObjectDepth: 8,
        logger: console,
        developmentEnvironments: ['dev', 'development', 'test'],
        debug: false,
        tags: null,
        enableUncaught: true,
        enableUnhandledRejection: true,
        reportTimeoutWarning: true,
        timeoutWarningThresholdMs: 50,
        filters: ['creditcard', 'password'],
        __plugins: [],
      })
    })

    it('creates a client with constructor arguments', function () {
      const opts = {
        apiKey: 'testing',
        environment: 'staging',
        developmentEnvironments: ['staging', 'dev', 'local'],
        tags: ['tag-1', 'tag-2']
      }
      const client = Singleton.factory(opts)
      expect(client.config).toMatchObject(opts)
    })

    it.each(['honeybadger.config.ts', 'honeybadger.config.js'])('creates a client from %p', function (fileName) {
      jest.doMock(`../../${fileName}`, () => CONFIG_FROM_FILE, { virtual: true })

      const client = Singleton.factory()
      expect(client.config).toMatchObject(CONFIG_FROM_FILE)
    })

    it('creates a client from both a configuration file and constructor arguments', function () {
      jest.doMock('../../honeybadger.config.js', () => CONFIG_FROM_FILE, { virtual: true })

      const client = Singleton.factory({
        apiKey: 'not-testing'
      })
      expect(client.config).toMatchObject({
        ...CONFIG_FROM_FILE,
        apiKey: 'not-testing'
      })
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
    it('sends a check-in report using a check-in id', async function () {
      client.configure({
        apiKey: 'testing',
        endpoint: 'http://api.honeybadger.io',
      })

      const checkInId = '123'
      const request = nock('http://api.honeybadger.io')
        .get(`/v1/check_in/${checkInId}`)
        .reply(201)

      await client.checkIn(checkInId)
      expect(request.isDone()).toBe(true)
    })

    it('sends a check-in report using a check-in slug', async function () {
      const apiKey = 'testing'
      const checkInConfig: CheckInDto = {
        slug: 'a-simple-check-in',
        scheduleType: 'simple',
        reportPeriod: '1 day',
      }
      client.configure({
        apiKey,
        personalAuthToken: 'testingToken',
        endpoint: 'http://api.honeybadger.io',
        checkins: [checkInConfig]
      })

      const checkinRequest = nock('http://api.honeybadger.io')
        .get(`/v1/check_in/${apiKey}/${checkInConfig.slug}`)
        .reply(201)

      await client.checkIn(checkInConfig.slug)
      expect(checkinRequest.isDone()).toBe(true)
    })
  })

  describe('__plugins', function () {
    it('exported singleton includes plugins', function () {
      Singleton.configure({ apiKey: 'foo' })
      expect(Singleton.config.__plugins.length).toBe(4)
    })

    it('clients produced via factory don\'t include plugins', function () {
      client.configure({ apiKey: 'foo' })
      expect(client.config.__plugins.length).toBe(0)
    })

    // Integration test with the plugins themselves
    it('uncaughtException and unhandledRejection plugins reload on configure', function () {
      function getListenerCount(type) {
        return process.listeners(type).length
      }
      Singleton.configure({ apiKey: 'foo' })
      expect(getListenerCount('uncaughtException')).toBe(1)
      expect(getListenerCount('unhandledRejection')).toBe(1)
      Singleton.configure({ enableUncaught: false, enableUnhandledRejection: false })
      expect(getListenerCount('uncaughtException')).toBe(0)
      expect(getListenerCount('unhandledRejection')).toBe(0)
    })
  })
})

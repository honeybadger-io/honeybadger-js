import { useFakeXMLHttpRequest } from 'sinon'
import Singleton from '../../src/browser'
// @ts-ignore
import { nullLogger } from './helpers'

describe('browser client', function () {
  let client: typeof Singleton
  let xhr: typeof useFakeXMLHttpRequest

  beforeEach(function () {
    client = Singleton.factory({
      logger: nullLogger()
    });

    // @ts-ignore - no need to test this in here
    client.__getSourceFileHandler = null

    xhr = useFakeXMLHttpRequest()
  })

  afterEach(function () {
    xhr.restore()
  })

  describe('Singleton', function () {
    it('implements the window.onerror plugin', function () {
      Singleton.configure()
      expect(Singleton.config.enableUncaught).toEqual(true)
    })

    it('implements the breadcrumbs plugin', function () {
      Singleton.configure()
      expect(Singleton.config.breadcrumbsEnabled).toEqual(true)
    })
  })

  describe('afterNotify', function () {
    beforeEach(function () {
      client.configure({
        apiKey: 'testing',
        environment: 'config environment',
        component: 'config component',
        action: 'config action',
        revision: 'config revision',
        projectRoot: 'config projectRoot'
      })
    })

    it('is called without an error when the request succeeds', function () {
      const id = '48b98609-dd3b-48ee-bffc-d51f309a2dfa'

      return new Promise<void>((resolve) => {
        client.afterNotify(function (err, notice) {
          expect(err).toBeUndefined()
          expect(notice.message).toEqual('testing')
          expect(notice.id).toBe(id)
          resolve()
        })

        client.notify('testing')

        xhr.onCreate = function (xhr) {
          setTimeout(() => {
            xhr.respond(201, {}, JSON.stringify({ id }))
          }, 0)
        }
      })

    })

    it('is called with an error when the request fails', function () {
      return new Promise<void>((resolve) => {
        client.afterNotify(function (err, notice) {
          expect(notice.message).toEqual('testing')
          expect(err.message).toMatch(/403/)
          resolve()
        })
        client.notify('testing')

        xhr.onCreate = function (xhr) {
          setTimeout(() => {
            xhr.respond(403, {}, '')
          }, 0)
        }
      })
    })

    it('is called without an error when passed as an option and the request succeeds', function () {
      return new Promise<void>((resolve) => {
        const afterNotify = (err, notice) => {
          expect(err).toBeUndefined()
          expect(notice.message).toEqual('testing')
          expect(notice.id).toBe(id)
          resolve()
        }
        const id = '48b98609-dd3b-48ee-bffc-d51f309a2dfa'
        client.notify('testing', { afterNotify })

        xhr.onCreate = function (xhr) {
          setTimeout(() => {
            xhr.respond(201, {}, JSON.stringify({ id }))
          },0)
        }
      })

    })

    it('is called with an error when passed as an option and the request fails', function () {
      return new Promise<void>((resolve) => {
        const afterNotify = (err,notice) => {
          expect(notice.message).toEqual('testing')
          expect(err.message).toMatch(/403/)
          resolve()
        }

        client.notify('testing', { afterNotify })

        xhr.onCreate = function (xhr) {
          setTimeout(() => {
            xhr.respond(403, {}, '')
          }, 0)
        }
      })
    })
  })

  describe('notify', function () {
    it('excludes cookies by default', function () {
      return new Promise<void>(resolve => {
        client.configure({
          apiKey: 'testing'
        })

        client.notify('testing')

        xhr.onCreate = function (xhr) {
          setTimeout(() => {
            const payload = JSON.parse(xhr.requestBody)
            expect(payload.request.cgi_data.HTTP_COOKIE).toBeUndefined()
            resolve()
          }, 0)
        }
      })
    })

    it('filters cookies string', function () {
      return new Promise<void>(resolve => {
        client.configure({
          apiKey: 'testing'
        })

        client.notify('testing', { cookies: 'expected=value; password=secret' })

        xhr.onCreate = function (xhr) {
          setTimeout(() => {
            const payload = JSON.parse(xhr.requestBody)
            expect(payload.request.cgi_data.HTTP_COOKIE).toEqual('expected=value;password=[FILTERED]')
            resolve()
          }, 0)
        }
      })
    })

    it('filters cookies object', function () {
      return new Promise<void>(resolve => {
        client.configure({
          apiKey: 'testing'
        })

        client.notify('testing', { cookies: { expected: 'value', password: 'secret' } })

        xhr.onCreate = function (xhr) {
          setTimeout(() => {
            const payload = JSON.parse(xhr.requestBody)
            expect(payload.request.cgi_data.HTTP_COOKIE).toEqual('expected=value;password=[FILTERED]')
            resolve()
          })
        }
      })
    })
  })
})

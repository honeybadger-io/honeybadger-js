import {useFakeXMLHttpRequest} from 'sinon'
import Singleton from '../../src/browser'
// @ts-ignore
import { nullLogger } from './helpers'

describe('browser client', function () {
  let client, requests, request, xhr

  beforeEach(function () {
    client = Singleton.factory({
      logger: nullLogger()
    })

    // no need to test this in here
    client.__getSourceFileHandler = null

    // Stub HTTP requests.
    request = undefined
    requests = []
    xhr = useFakeXMLHttpRequest()
    xhr.onCreate = function (xhr) {
      request = xhr
      return requests.push(xhr)
    }
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

      return new Promise<void>((resolve, reject) => {
        client.afterNotify(function (err, notice) {
          expect(requests).toHaveLength(1)
          expect(err).toBeUndefined()
          expect(notice.message).toEqual('testing')
          expect(notice.id).toBe(id)
          resolve()
        })

        client.notify('testing')
          .then(()=> {
            request.respond(201, {}, JSON.stringify({ id }))
          })
          .catch(reject)
      })

    })

    it('is called with an error when the request fails', function () {
      return new Promise<void>((resolve, reject) => {
        client.afterNotify(function (err, notice) {
          expect(requests).toHaveLength(1)
          expect(notice.message).toEqual('testing')
          expect(err.message).toMatch(/403/)
          resolve()
        })
        client.notify('testing')
          .then(() => {
            request.respond(403, {}, '')
          })
          .catch(reject)
      })
    })

    it('is called without an error when passed as an option and the request succeeds', function () {
      return new Promise<void>((resolve, reject) => {
        const afterNotify = (err, notice) => {
          expect(requests).toHaveLength(1)
          expect(err).toBeUndefined()
          expect(notice.message).toEqual('testing')
          expect(notice.id).toBe(id)
          resolve()
        }
        const id = '48b98609-dd3b-48ee-bffc-d51f309a2dfa'
        client.notify('testing', { afterNotify })
          .then(() => {
            request.respond(201, {}, JSON.stringify({ id }))
          })
          .catch(reject)
      })

    })

    it('is called with an error when passed as an option and the request fails', function () {
      return new Promise<void>((resolve, reject) => {
        const afterNotify = (err,notice) => {
          expect(requests).toHaveLength(1)
          expect(notice.message).toEqual('testing')
          expect(err.message).toMatch(/403/)
          resolve()
        }

        client.notify('testing', { afterNotify })
          .then(() => {
            request.respond(403, {}, '')
          })
          .catch(reject)
      })
    })
  })

  describe('notify', function () {
    it('excludes cookies by default', async function () {
      client.configure({
        apiKey: 'testing'
      })

      await client.notify('testing')

      expect(requests).toHaveLength(1)

      const payload = JSON.parse(requests[0].requestBody)
      expect(payload.request.cgi_data.HTTP_COOKIE).toBeUndefined()
    })

    it('filters cookies string', async function () {
      client.configure({
        apiKey: 'testing'
      })

      await client.notify('testing', {cookies: 'expected=value; password=secret'})

      expect(requests).toHaveLength(1)

      const payload = JSON.parse(requests[0].requestBody)
      expect(payload.request.cgi_data.HTTP_COOKIE).toEqual('expected=value;password=[FILTERED]')
    })

    it('filters cookies object', async function () {
      client.configure({
        apiKey: 'testing'
      })

      await client.notify('testing', {cookies: {expected: 'value', password: 'secret'}})

      expect(requests).toHaveLength(1)

      const payload = JSON.parse(requests[0].requestBody)
      expect(payload.request.cgi_data.HTTP_COOKIE).toEqual('expected=value;password=[FILTERED]')
    })
  })
})

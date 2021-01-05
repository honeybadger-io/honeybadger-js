import sinon from 'sinon'
import Singleton from '../../src/browser'
import { nullLogger } from './helpers'

describe('browser client', function () {
  let client, requests, request, xhr

  beforeEach(function () {
    client = Singleton.factory({
      logger: nullLogger()
    })

    // Stub HTTP requests.
    request = undefined
    requests = []
    xhr = sinon.useFakeXMLHttpRequest()
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
      return new Promise(resolve => {
        const id = '48b98609-dd3b-48ee-bffc-d51f309a2dfa'
        client.afterNotify(function (err, notice) {
          expect(err).toBeUndefined()
          expect(notice.message).toEqual('testing')
          expect(notice.id).toBe(id)
          resolve(true)
        })
        client.notify('testing')

        expect(requests).toHaveLength(1)
        request.respond(201, {}, JSON.stringify({ id }))
      })
    })

    it('is called with an error when the request fails', function () {
      return new Promise(resolve => {
        client.afterNotify(function (err, notice) {
          expect(notice.message).toEqual('testing')
          expect(err.message).toMatch(/403/)
          resolve(true)
        })
        client.notify('testing')

        expect(requests).toHaveLength(1)
        request.respond(403, {}, '')
      })
    })

    it('is called without an error when passed as an option and the request succeeds', function () {
      return new Promise(resolve => {
        const id = '48b98609-dd3b-48ee-bffc-d51f309a2dfa'
        client.notify('testing', {
          afterNotify: (err, notice) => {
            expect(err).toBeUndefined()
            expect(notice.message).toEqual('testing')
            expect(notice.id).toBe(id)
            resolve(true)
          }
        })

        expect(requests).toHaveLength(1)
        request.respond(201, {}, JSON.stringify({ id }))
      })
    })

    it('is called with an error when passed as an option and the request fails', function () {
      return new Promise(resolve => {
        client.notify('testing', {
          afterNotify: (err, notice) => {
            expect(notice.message).toEqual('testing')
            expect(err.message).toMatch(/403/)
            resolve(true)
          }
        })

        expect(requests).toHaveLength(1)
        request.respond(403, {}, '')
      })
    })
  })
})

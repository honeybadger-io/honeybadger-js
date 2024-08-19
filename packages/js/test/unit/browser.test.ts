import Singleton from '../../src/browser'
import { nullLogger } from './helpers'
import fetch from 'jest-fetch-mock'

describe('browser client', function () {
  let client: typeof Singleton

  beforeEach(function () {
    client = Singleton.factory({
      logger: nullLogger()
    })

    // @ts-expect-error - no need to test this in here
    client.__getSourceFileHandler = null

    fetch.resetMocks()
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
      const body = JSON.stringify({ id })
      fetch.mockResponseOnce(body, { status: 201 })

      return new Promise<void>((resolve) => {
        client.afterNotify(function (err, notice) {
          expect(err).toBeUndefined()
          expect(notice.message).toEqual('testing')
          expect(notice.id).toBe(id)
          resolve()
        })

        client.notify('testing')
      })
    })

    it('is called with an error when the request fails', function () {
      return new Promise<void>((resolve) => {
        fetch.mockResponse(JSON.stringify({}), { status: 403 })

        client.afterNotify(function (err, notice) {
          expect(notice.message).toEqual('testing')
          expect(err.message).toMatch(/403/)
          resolve()
        })

        client.notify('testing')
      })
    })

    it('is called without an error when passed as an option and the request succeeds', function () {
      return new Promise<void>((resolve) => {
        const id = '48b98609-dd3b-48ee-bffc-d51f309a2dfa'
        const body = JSON.stringify({ id })
        fetch.mockResponseOnce(body, { status: 201 })

        const afterNotify = (err, notice) => {
          expect(err).toBeUndefined()
          expect(notice.message).toEqual('testing')
          expect(notice.id).toBe(id)
          resolve()
        }

        client.notify('testing', { afterNotify })
      })
    })

    it('is called with an error when passed as an option and the request fails', function () {
      return new Promise<void>((resolve) => {
        const afterNotify = (err, notice) => {
          expect(notice.message).toEqual('testing')
          expect(err.message).toMatch(/403/)
          resolve()
        }

        fetch.mockResponseOnce(JSON.stringify({}), { status: 403 })

        client.notify('testing', { afterNotify })
      })
    })
  })

  describe('notify', function () {
    it('does not report if notice is empty', function () {
      client.configure({
        apiKey: 'testing'
      })

      const result = client.notify({})
      expect(result).toEqual(false)
    })

    it('excludes cookies by default', async function () {
      client.configure({
        apiKey: 'testing'
      })

      fetch.mockResponseOnce(JSON.stringify({ id: '1' }), { status: 201 })
      await client.notifyAsync('testing')

      // @ts-expect-error
      const payload = JSON.parse(fetch.mock.lastCall[1].body)
      expect(payload.request.cgi_data.HTTP_COOKIE).toBeUndefined()
    })

    it('filters cookies string', async function () {
      client.configure({
        apiKey: 'testing'
      })

      fetch.mockResponseOnce(JSON.stringify({ id: '1' }), { status: 201 })
      await client.notifyAsync('testing', {
        cookies: 'expected=value; password=secret'
      })

      // @ts-expect-error
      const payload = JSON.parse(fetch.mock.lastCall[1].body)
      expect(payload.request.cgi_data.HTTP_COOKIE).toEqual('expected=value;password=[FILTERED]')
    })

    it('filters cookies object', async function () {
      client.configure({
        apiKey: 'testing'
      })

      fetch.mockResponseOnce(JSON.stringify({ id: '1' }), { status: 201 })
      await client.notifyAsync('testing', { cookies: { expected: 'value', password: 'secret' } })

      // @ts-expect-error
      const payload = JSON.parse(fetch.mock.lastCall[1].body)
      expect(payload.request.cgi_data.HTTP_COOKIE).toEqual('expected=value;password=[FILTERED]')
    })

    it('uses the correct notifier name', async function () {
      client.configure({
        apiKey: 'testing'
      })

      fetch.mockResponseOnce(JSON.stringify({ id: '1' }), { status: 201 })
      await client.notifyAsync('testing')

      // @ts-expect-error
      const payload = JSON.parse(fetch.mock.lastCall[1].body)
      expect(payload.notifier.name).toEqual('@honeybadger-io/js')
    })
  })
})

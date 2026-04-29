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

  describe('ignoreBrowserExtensionErrors', function () {
    beforeEach(function () {
      client.configure({
        apiKey: 'testing'
      })
    })

    it('is false by default', function () {
      expect(client.config.ignoreBrowserExtensionErrors).toEqual(false)
    })

    it('does not filter errors from non-extension sources when enabled', function () {
      client.configure({ ignoreBrowserExtensionErrors: true })
      const result = client.notify({
        message: 'test error',
        backtrace: [{ file: 'https://example.com/app.js', method: 'foo', number: 1, column: 1 }]
      })
      expect(result).toEqual(true)
    })

    it('filters chrome-extension errors when enabled', function () {
      client.configure({ ignoreBrowserExtensionErrors: true })
      const result = client.notify({
        message: 'test error',
        backtrace: [{ file: 'chrome-extension://abcdefg/content.js', method: 'foo', number: 1, column: 1 }]
      })
      expect(result).toEqual(false)
    })

    it('filters moz-extension errors when enabled', function () {
      client.configure({ ignoreBrowserExtensionErrors: true })
      const result = client.notify({
        message: 'test error',
        backtrace: [{ file: 'moz-extension://abcdefg/content.js', method: 'foo', number: 1, column: 1 }]
      })
      expect(result).toEqual(false)
    })

    it('filters safari-extension errors when enabled', function () {
      client.configure({ ignoreBrowserExtensionErrors: true })
      const result = client.notify({
        message: 'test error',
        backtrace: [{ file: 'safari-extension://abcdefg/content.js', method: 'foo', number: 1, column: 1 }]
      })
      expect(result).toEqual(false)
    })

    it('filters safari-web-extension errors when enabled', function () {
      client.configure({ ignoreBrowserExtensionErrors: true })
      const result = client.notify({
        message: 'test error',
        backtrace: [{ file: 'safari-web-extension://abcdefg/content.js', method: 'foo', number: 1, column: 1 }]
      })
      expect(result).toEqual(false)
    })

    it('does not filter browser extension errors when disabled', function () {
      client.configure({ ignoreBrowserExtensionErrors: false })
      const result = client.notify({
        message: 'test error',
        backtrace: [{ file: 'chrome-extension://abcdefg/content.js', method: 'foo', number: 1, column: 1 }]
      })
      expect(result).toEqual(true)
    })

    it('does not filter errors with an empty backtrace when enabled', function () {
      client.configure({ ignoreBrowserExtensionErrors: true })
      const result = client.notify({
        message: 'test error',
        backtrace: []
      })
      // empty backtrace means no top frame, so it should not be filtered
      expect(result).toEqual(true)
    })

    it('does not count ignored extension errors against maxErrors', function () {
      client.configure({ ignoreBrowserExtensionErrors: true, maxErrors: 1 })

      // This extension error should be ignored and NOT count against maxErrors
      const extensionResult = client.notify({
        message: 'extension error',
        backtrace: [{ file: 'chrome-extension://abcdefg/content.js', method: 'foo', number: 1, column: 1 }]
      })
      expect(extensionResult).toEqual(false)

      // The next real app error should still be reported (maxErrors not yet reached)
      const appResult = client.notify({
        message: 'real app error',
        backtrace: [{ file: 'https://example.com/app.js', method: 'bar', number: 10, column: 1 }]
      })
      expect(appResult).toEqual(true)
    })
  })
})

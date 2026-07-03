/* eslint-disable @typescript-eslint/no-explicit-any */
import fastify, { FastifyInstance } from 'fastify'
import Singleton from '../../../src/server'
import { fastifyPlugin } from '../../../src/server/fastify'
import { nullLogger } from '../helpers'

describe('Fastify plugin', function () {
  let client: typeof Singleton
  let app: FastifyInstance
  let workerLogSpy: jest.SpyInstance

  // The events worker is `protected` on Client; in tests we read it via `as any`.
  const eventsWorker = () => (client as any).__eventsWorker

  const waitForEvents = () => new Promise((resolve) => setTimeout(resolve, 50))

  function buildApp() {
    const instance = fastify({ logger: false })
    instance.register(fastifyPlugin(client))

    instance.get('/items/:id', async () => ({ ok: true }))
    instance.get('/custom', async () => {
      client.event('custom', { msg: 'hi' })
      return { ok: true }
    })
    instance.get('/fail', async () => {
      throw new Error('boom')
    })

    return instance
  }

  beforeEach(function () {
    client = Singleton.factory({
      logger: nullLogger(),
      environment: null
    })
    // Stub the worker's queue entry point: the spy still records the merged
    // event payloads, but nothing enters the queue — otherwise the worker's
    // dispatch cooldown timer keeps the jest process alive after the run.
    workerLogSpy = jest.spyOn(eventsWorker(), 'log').mockImplementation(() => undefined)
  })

  afterEach(async function () {
    if (app) await app.close()
  })

  describe('plugin shape', function () {
    it('is a factory returning a fastify-plugin-wrapped plugin function', function () {
      const plugin = fastifyPlugin(client)
      expect(typeof plugin).toBe('function')
      // fastify-plugin hoists the hooks out of plugin encapsulation so they
      // cover the user's routes
      expect((plugin as any)[Symbol.for('skip-override')]).toBe(true)
      expect((plugin as any)[Symbol.for('fastify.display-name')]).toBe('@honeybadger-io/js')
    })

    it('does not attach fastifyPlugin to the singleton instance', function () {
      expect((Singleton as any).fastifyPlugin).toBeUndefined()
      expect((client as any).fastifyPlugin).toBeUndefined()
    })

    it('throws with install instructions when fastify-plugin is not installed', function () {
      jest.isolateModules(() => {
        jest.doMock('fastify-plugin', () => {
          throw new Error('Cannot find module \'fastify-plugin\'')
        })
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { fastifyPlugin: isolated } = require('../../../src/server/fastify')
        expect(() => isolated(client)).toThrow(/npm install fastify-plugin/)
        jest.dontMock('fastify-plugin')
      })
    })
  })

  describe('with insights: { enabled: true, http: true }', function () {
    beforeEach(function () {
      client.configure({
        insights: { enabled: true, http: true },
      })
      app = buildApp()
    })

    it('emits a single request.handled event with method, path, route, status, and duration', async function () {
      const evSpy = jest.spyOn(client, 'event')

      const res = await app.inject({ method: 'GET', url: '/items/42?secret=1' })
      expect(res.statusCode).toBe(200)

      const calls = evSpy.mock.calls.filter(c => c[0] === 'request.handled')
      expect(calls).toHaveLength(1)
      const payload = calls[0][1] as Record<string, unknown>
      expect(payload).toMatchObject({
        method: 'GET',
        path: '/items/42',
        route: '/items/:id',
        status: 200,
      })
      expect(typeof payload.duration).toBe('number')
      expect(payload.duration).toBeGreaterThanOrEqual(0)
    })

    it('carries request_id/correlation_id seeded in onRequest on the event emitted in onResponse', async function () {
      await app.inject({
        method: 'GET',
        url: '/items/42',
        headers: { 'x-request-id': 'abc-123' },
      })
      await waitForEvents()

      const call = workerLogSpy.mock.calls.find(
        (c) => (c[0] as Record<string, unknown>).event_type === 'request.handled'
      )
      expect(call).toBeDefined()
      const payload = call[0] as Record<string, unknown>
      expect(payload.request_id).toBe('abc-123')
      expect(payload.correlation_id).toBe('abc-123')
    })

    it('uses x-correlation-id for correlation_id (distinct from request_id)', async function () {
      await app.inject({
        method: 'GET',
        url: '/items/42',
        headers: { 'x-request-id': 'req-1', 'x-correlation-id': 'trace-9' },
      })
      await waitForEvents()

      const call = workerLogSpy.mock.calls.find(
        (c) => (c[0] as Record<string, unknown>).event_type === 'request.handled'
      )
      expect(call).toBeDefined()
      const payload = call[0] as Record<string, unknown>
      expect(payload.request_id).toBe('req-1')
      expect(payload.correlation_id).toBe('trace-9')
    })

    it('generates non-empty equal ids when no headers are present', async function () {
      await app.inject({ method: 'GET', url: '/items/42' })
      await waitForEvents()

      const call = workerLogSpy.mock.calls.find(
        (c) => (c[0] as Record<string, unknown>).event_type === 'request.handled'
      )
      expect(call).toBeDefined()
      const payload = call[0] as Record<string, unknown>
      expect(typeof payload.request_id).toBe('string')
      expect((payload.request_id as string).length).toBeGreaterThan(0)
      expect(payload.correlation_id).toBe(payload.request_id)
    })

    it('emits with status 500 when the route handler throws', async function () {
      const evSpy = jest.spyOn(client, 'event')

      const res = await app.inject({ method: 'GET', url: '/fail' })
      expect(res.statusCode).toBe(500)

      const call = evSpy.mock.calls.find(c => c[0] === 'request.handled')
      expect(call).toBeDefined()
      const payload = call[1] as Record<string, unknown>
      expect(payload.status).toBe(500)
    })

    it('does not leak event context between concurrent requests', async function () {
      await Promise.all([1, 2].map((i) => app.inject({
        method: 'GET',
        url: '/items/42',
        headers: { 'x-request-id': `rid-${i}` },
      })))
      await waitForEvents()

      const ids = workerLogSpy.mock.calls
        .filter((c) => (c[0] as Record<string, unknown>).event_type === 'request.handled')
        .map((c) => (c[0] as Record<string, unknown>).request_id)
      expect(ids.sort()).toEqual(['rid-1', 'rid-2'])
    })
  })

  describe('gating', function () {
    it('with default config, does not emit request.handled but programmatic events carry request_id/correlation_id', async function () {
      app = buildApp()

      const res = await app.inject({
        method: 'GET',
        url: '/custom',
        headers: { 'x-request-id': 'rid-prog' },
      })
      expect(res.statusCode).toBe(200)
      await waitForEvents()

      const requestHandledCall = workerLogSpy.mock.calls.find(
        (c) => (c[0] as Record<string, unknown>).event_type === 'request.handled'
      )
      expect(requestHandledCall).toBeUndefined()

      const customCall = workerLogSpy.mock.calls.find(
        (c) => (c[0] as Record<string, unknown>).event_type === 'custom'
      )
      expect(customCall).toBeDefined()
      const payload = customCall[0] as Record<string, unknown>
      expect(payload.request_id).toBe('rid-prog')
      expect(payload.correlation_id).toBe('rid-prog')
    })

    it('with insights.enabled: false, does not emit request.handled even when insights.http is true', async function () {
      client.configure({
        insights: { enabled: false, http: true },
      })
      app = buildApp()
      const evSpy = jest.spyOn(client, 'event')

      await app.inject({ method: 'GET', url: '/items/42' })

      expect(evSpy.mock.calls.find(c => c[0] === 'request.handled')).toBeUndefined()
    })

    it('with insights.http: true but insights.enabled missing (footgun), does not emit request.handled', async function () {
      client.configure({
        // intentionally omitting `enabled` — verifies the footgun is gated off
        insights: { http: true },
      })
      app = buildApp()
      const evSpy = jest.spyOn(client, 'event')

      await app.inject({ method: 'GET', url: '/items/42' })

      expect(evSpy.mock.calls.find(c => c[0] === 'request.handled')).toBeUndefined()
    })

    it('with deprecated eventsEnabled: true alone, does not emit request.handled (shim enables console, not http)', async function () {
      client.configure({
        eventsEnabled: true,
      })
      app = buildApp()

      await app.inject({ method: 'GET', url: '/custom' })
      await waitForEvents()

      const requestHandledCall = workerLogSpy.mock.calls.find(
        (c) => (c[0] as Record<string, unknown>).event_type === 'request.handled'
      )
      expect(requestHandledCall).toBeUndefined()

      const customCall = workerLogSpy.mock.calls.find(
        (c) => (c[0] as Record<string, unknown>).event_type === 'custom'
      )
      expect(customCall).toBeDefined()
    })
  })
})

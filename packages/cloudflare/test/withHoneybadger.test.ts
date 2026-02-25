import type { ExecutionContext } from '@cloudflare/workers-types'
import { withHoneybadger, getConfigFromEnv } from '../src/index'

jest.mock('@honeybadger-io/js', () => {
  const mockConfigure = jest.fn()
  const mockSetContext = jest.fn()
  const mockNotifyAsync = jest.fn().mockResolvedValue(undefined)
  const mock = {
    configure: mockConfigure,
    setContext: mockSetContext,
    notifyAsync: mockNotifyAsync,
    config: { apiKey: undefined as string | undefined },
  }
  mockConfigure.mockImplementation((opts: { apiKey?: string }) => {
    mock.config.apiKey = opts.apiKey
  })
  return { __esModule: true, default: mock }
})

const HoneybadgerMock = jest.requireMock('@honeybadger-io/js').default
const mockConfigure = HoneybadgerMock.configure as jest.Mock
const mockSetContext = HoneybadgerMock.setContext as jest.Mock
const mockNotifyAsync = HoneybadgerMock.notifyAsync as jest.Mock

describe('withHoneybadger', () => {
  const waitUntil = jest.fn((p: Promise<unknown>) => p)

  const mockCtx = {
    waitUntil,
    passThroughOnException: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    HoneybadgerMock.config.apiKey = undefined
  })

  describe('getConfig', () => {
    it('calls getConfig with env and passes result to Honeybadger.configure', async () => {
      const env = { HONEYBADGER_API_KEY: 'test-key' }
      const getConfig = jest.fn((e: typeof env) => ({ apiKey: e.HONEYBADGER_API_KEY }))
      const handler = {
        fetch: jest.fn().mockResolvedValue(new Response('ok')),
      }
      const wrapped = withHoneybadger(getConfig, handler)
      const request = new Request('https://example.com/', { method: 'GET' })

      await wrapped.fetch!(request as unknown as Parameters<typeof wrapped.fetch>[0], env, mockCtx as unknown as ExecutionContext)

      expect(getConfig).toHaveBeenCalledWith(env)
      expect(mockConfigure).toHaveBeenCalledWith({ apiKey: 'test-key' })
    })

    it('when apiKey present in config, configures Honeybadger before handler', async () => {
      const env = { HONEYBADGER_API_KEY: 'key' }
      const handler = {
        fetch: jest.fn().mockResolvedValue(new Response('ok')),
      }
      const originalFetch = handler.fetch
      const wrapped = withHoneybadger(
        (e) => ({ apiKey: e.HONEYBADGER_API_KEY }),
        handler
      )
      const request = new Request('https://example.com/')

      await wrapped.fetch!(request as unknown as Parameters<typeof wrapped.fetch>[0], env, mockCtx as unknown as ExecutionContext)

      expect(mockConfigure).toHaveBeenCalled()
      expect(originalFetch).toHaveBeenCalled()
      expect(mockConfigure.mock.invocationCallOrder[0]).toBeLessThan(
        originalFetch.mock.invocationCallOrder[0]
      )
    })

    it('when apiKey absent in config, does not configure and handler runs normally', async () => {
      const env = {}
      const handler = {
        fetch: jest.fn().mockResolvedValue(new Response('ok')),
      }
      const originalFetch = handler.fetch
      const wrapped = withHoneybadger(() => ({}), handler)
      const request = new Request('https://example.com/')

      await wrapped.fetch!(request as unknown as Parameters<typeof wrapped.fetch>[0], env, mockCtx as unknown as ExecutionContext)

      expect(mockConfigure).not.toHaveBeenCalled()
      expect(originalFetch).toHaveBeenCalled()
    })
  })

  describe('fetch handler', () => {
    it('on fetch error, calls notifyAsync and uses waitUntil', async () => {
      HoneybadgerMock.config.apiKey = 'key'
      const env = {}
      const handler = {
        fetch: jest.fn().mockRejectedValue(new Error('fetch failed')),
      }
      const wrapped = withHoneybadger(() => ({ apiKey: 'key' }), handler)
      const request = new Request('https://example.com/')

      await expect(
        wrapped.fetch!(request as unknown as Parameters<typeof wrapped.fetch>[0], env, mockCtx as unknown as ExecutionContext)
      ).rejects.toThrow('fetch failed')

      expect(waitUntil).toHaveBeenCalled()
      expect(mockNotifyAsync).toHaveBeenCalledWith(expect.any(Error))
    })

    it('on success, returns handler response without reporting', async () => {
      const env = { HONEYBADGER_API_KEY: 'key' }
      const handler = {
        fetch: jest.fn().mockResolvedValue(new Response('ok', { status: 200 })),
      }
      const wrapped = withHoneybadger(
        (e) => ({ apiKey: e.HONEYBADGER_API_KEY }),
        handler
      )
      const request = new Request('https://example.com/')

      const response = await wrapped.fetch!(
        request as unknown as Parameters<typeof wrapped.fetch>[0],
        env,
        mockCtx as unknown as ExecutionContext
      )

      expect(response?.status).toBe(200)
      expect(mockNotifyAsync).not.toHaveBeenCalled()
    })

    it('setContext called with url and method from Request', async () => {
      const env = { HONEYBADGER_API_KEY: 'key' }
      const handler = {
        fetch: jest.fn().mockResolvedValue(new Response('ok')),
      }
      const wrapped = withHoneybadger(
        (e) => ({ apiKey: e.HONEYBADGER_API_KEY }),
        handler
      )
      const request = new Request('https://example.com/foo', { method: 'POST' })

      await wrapped.fetch!(request as unknown as Parameters<typeof wrapped.fetch>[0], env, mockCtx as unknown as ExecutionContext)

      expect(mockSetContext).toHaveBeenCalledWith({
        url: 'https://example.com/foo',
        method: 'POST',
      })
    })
  })

  describe('scheduled handler', () => {
    it('wraps scheduled and reports errors', async () => {
      HoneybadgerMock.config.apiKey = 'key'
      const env = {}
      const controller = {
        cron: '0 * * * *',
        scheduledTime: Date.now() / 1000,
        noRetry: jest.fn(),
      }
      const handler = {
        scheduled: jest.fn().mockRejectedValue(new Error('scheduled failed')),
      }
      const wrapped = withHoneybadger(() => ({ apiKey: 'key' }), handler)

      await expect(
        wrapped.scheduled!(controller, env, mockCtx as unknown as ExecutionContext)
      ).rejects.toThrow('scheduled failed')

      expect(waitUntil).toHaveBeenCalled()
      expect(mockNotifyAsync).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  describe('queue handler', () => {
    it('wraps queue and reports errors', async () => {
      HoneybadgerMock.config.apiKey = 'key'
      const env = {}
      const batch = {
        queue: 'my-queue',
        messages: [{ id: '1', body: {}, timestamp: Date.now(), attempts: 1, retry: jest.fn(), ack: jest.fn() }],
        ackAll: jest.fn(),
        retryAll: jest.fn(),
      }
      const handler = {
        queue: jest.fn().mockRejectedValue(new Error('queue failed')),
      }
      const wrapped = withHoneybadger(() => ({ apiKey: 'key' }), handler)

      await expect(
        wrapped.queue!(batch as unknown as Parameters<typeof wrapped.queue>[0], env, mockCtx as unknown as ExecutionContext)
      ).rejects.toThrow('queue failed')

      expect(waitUntil).toHaveBeenCalled()
      expect(mockNotifyAsync).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  describe('only wraps handlers that exist', () => {
    it('returns handler with only fetch when only fetch is provided', () => {
      const handler = { fetch: jest.fn() }
      const wrapped = withHoneybadger(() => ({}), handler)

      expect(wrapped.fetch).toBeDefined()
      expect(wrapped.scheduled).toBeUndefined()
      expect(wrapped.queue).toBeUndefined()
    })
  })
})

describe('getConfigFromEnv', () => {
  it('returns apiKey and environment from env.HONEYBADGER_API_KEY', () => {
    const env = { HONEYBADGER_API_KEY: 'hb-key-123' }
    const config = getConfigFromEnv(env)
    expect(config).toEqual({ apiKey: 'hb-key-123', environment: 'production' })
  })

  it('returns undefined apiKey when HONEYBADGER_API_KEY is missing', () => {
    const config = getConfigFromEnv({})
    expect(config.apiKey).toBeUndefined()
  })
})

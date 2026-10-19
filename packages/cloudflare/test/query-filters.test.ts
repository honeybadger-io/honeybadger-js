import type { ExecutionContext } from '@cloudflare/workers-types'
import Honeybadger from '@honeybadger-io/js'
import { withHoneybadger } from '../src/index'

/**
 * `withHoneybadger.test.ts` mocks `@honeybadger-io/js` wholesale, so it can only assert what
 * this package hands over. This file deliberately does not mock it: it runs a real client
 * with `filters` configured and reads the payload at the transport, the last point before it
 * leaves the isolate.
 */
describe('query string filtering, end to end', () => {
  let sent: Record<string, any>[]
  let pending: Promise<unknown>[]

  const ctx = {
    waitUntil: (promise: Promise<unknown>) => { pending.push(promise) },
    passThroughOnException: () => undefined,
  } as unknown as ExecutionContext

  beforeEach(() => {
    sent = []
    pending = []
    Honeybadger.configure({ apiKey: 'testing', reportData: true, filters: ['token'] })
    Honeybadger.clear()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(Honeybadger as any).__transport = {
      send: (_opts: unknown, body: Record<string, unknown>) => {
        sent.push(body)
        return Promise.resolve({ statusCode: 201, body: '{}' })
      },
    }
  })

  afterEach(() => {
    Honeybadger.clear()
  })

  it('filters the query string of the request url', async () => {
    const env = { HONEYBADGER_API_KEY: 'testing' }
    const wrapped = withHoneybadger(
      () => ({ apiKey: env.HONEYBADGER_API_KEY }),
      { fetch: () => { throw new Error('boom') } } as never
    )
    const request = { url: 'https://example.com/checkout?token=s3cret&step=2', method: 'GET' }

    await expect(
      wrapped.fetch!(request as never, env as never, ctx)
    ).rejects.toThrow('boom')
    await Promise.all(pending)

    expect(sent).toHaveLength(1)
    expect(sent[0].request.url).toEqual('https://example.com/checkout?token=[FILTERED]&step=2')
    // Context is never filtered, so it must not carry the query string at all.
    expect(sent[0].request.context.url).toEqual('https://example.com/checkout')
    expect(JSON.stringify(sent[0].request)).not.toContain('s3cret')
  })
})

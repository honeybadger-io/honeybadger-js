import Honeybadger from '@honeybadger-io/js'
import { captureRequestError } from './capture-request-error'
import type { RequestErrorContext, RequestErrorRequest } from './capture-request-error'
import { captureRouterTransitionStart } from './capture-router-transition-start'

/**
 * The other test files in this package mock `notifyAsync` / `addBreadcrumb` and assert what
 * this package hands over. That proves the handoff but not the outcome, so these tests run a
 * real client with `filters` configured and read the payload at the transport — the last
 * point before it leaves the process.
 */
describe('query string filtering, end to end', () => {
  let sent: Record<string, any>[]

  beforeEach(() => {
    sent = []
    Honeybadger.configure({
      apiKey: 'testing',
      reportData: true,
      filters: ['token'],
    })
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

  const request = (path: string): RequestErrorRequest => ({ path, method: 'GET', headers: {} })
  const errorContext = (): RequestErrorContext => ({
    routerKind: 'App Router',
    routePath: '/checkout',
    routeType: 'render',
  })

  it('filters the query string of the request path reported by captureRequestError', async () => {
    await captureRequestError(new Error('boom'), request('/checkout?token=s3cret&step=2'), errorContext())

    expect(sent).toHaveLength(1)
    expect(sent[0].request.url).toEqual('/checkout?token=[FILTERED]&step=2')
    // Context is never filtered, so it must not carry the query string at all.
    expect(sent[0].request.context.path).toEqual('/checkout')
    // Scoped to `request`: the backtrace carries source excerpts of this very file, so the
    // literal below legitimately appears there.
    expect(JSON.stringify(sent[0].request)).not.toContain('s3cret')
  })

  it('filters the query string of a navigation breadcrumb', async () => {
    captureRouterTransitionStart('/checkout?token=s3cret&step=2', 'push')

    await captureRequestError(new Error('boom'), request('/checkout'), errorContext())

    const trail = sent[0].breadcrumbs.trail
    const navigation = trail.find((crumb: Record<string, unknown>) => crumb.category === 'navigation')

    expect(navigation.message).toEqual('Navigated to /checkout')
    expect(navigation.metadata.url).toEqual('/checkout?token=[FILTERED]&step=2')
    expect(JSON.stringify(sent[0].breadcrumbs)).not.toContain('s3cret')
  })
})

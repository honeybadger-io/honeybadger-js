import Honeybadger from '@honeybadger-io/js'
import { captureRouterTransitionStart } from './capture-router-transition-start'

describe('captureRouterTransitionStart', () => {
  let addBreadcrumb: jest.SpyInstance

  beforeEach(() => {
    addBreadcrumb = jest.spyOn(Honeybadger, 'addBreadcrumb').mockReturnValue(Honeybadger)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const opts = () => addBreadcrumb.mock.calls[0][1]
  const message = () => addBreadcrumb.mock.calls[0][0]

  it('records the navigation as a breadcrumb', () => {
    captureRouterTransitionStart('/dashboard', 'push')

    expect(addBreadcrumb).toHaveBeenCalledTimes(1)
    expect(message()).toEqual('Navigated to /dashboard')
    expect(opts()).toEqual({
      category: 'navigation',
      metadata: { url: '/dashboard', navigationType: 'push' },
    })
  })

  // The message is not filtered anywhere -- `filterBreadcrumbs` only reaches metadata -- so
  // the query string must not be interpolated into it. The full url stays in the metadata,
  // where the configured `filters` are applied when the payload is built.
  it('keeps the query string out of the message and leaves it in the metadata', () => {
    captureRouterTransitionStart('/checkout?token=abc&step=2', 'replace')

    expect(message()).toEqual('Navigated to /checkout')
    expect(opts().metadata.url).toEqual('/checkout?token=abc&step=2')
  })

  it('carries the navigation type through', () => {
    captureRouterTransitionStart('/back', 'traverse')

    expect(opts().metadata.navigationType).toEqual('traverse')
  })
})

import { Types } from '@honeybadger-io/core'
import breadcrumbs from '../../../../src/browser/integrations/breadcrumbs'
import { nullLogger, TestClient, TestTransport } from '../../helpers'

describe('breadcrumbs click integration', function () {
  let client, mockAddBreadcrumb, handlers, fakeWindow

  beforeEach(function () {
    // { dom: true } isolates the click listener so the console/fetch/navigation
    // instrumentation is not installed on the minimal fakeWindow.
    client = new TestClient(
      { logger: nullLogger(), breadcrumbsEnabled: { dom: true } },
      new TestTransport()
    )
    mockAddBreadcrumb = jest.fn()
    client.addBreadcrumb = mockAddBreadcrumb

    handlers = {}
    fakeWindow = {
      addEventListener: (type, handler) => { handlers[type] = handler },
      location: { href: 'https://example.com' },
      history: {}
    }
  })

  function click(target) {
    handlers['click']({ target, isTrusted: true })
  }

  it('builds the selector using the default breadcrumbsSelectorAttributes', function () {
    // client.config.breadcrumbsSelectorAttributes is undefined here (TestClient does
    // not apply browser defaults), so the util default ['data-hb-name'] is used.
    breadcrumbs(fakeWindow).load(client)

    const card = document.createElement('div')
    card.setAttribute('data-hb-name', 'deal-card')
    const h3 = document.createElement('h3')
    h3.setAttribute('class', 'text-left font-semibold')
    card.appendChild(h3)

    click(h3)

    const metadata = mockAddBreadcrumb.mock.calls[0][1].metadata
    expect(metadata.selector).toEqual('deal-card > h3.text-left.font-semibold')
  })

  it('reflects breadcrumbsSelectorAttributes changed after the plugin loads', function () {
    breadcrumbs(fakeWindow).load(client)
    // Cast: breadcrumbsSelectorAttributes lives on BrowserConfig, but TestClient is
    // typed to core Config. Casting the literal avoids the excess-property check.
    client.configure({ breadcrumbsSelectorAttributes: ['data-testid'] } as Partial<Types.BrowserConfig>)

    const card = document.createElement('div')
    card.setAttribute('data-testid', 'deal-card')
    const button = document.createElement('button')
    card.appendChild(button)

    click(button)

    const metadata = mockAddBreadcrumb.mock.calls[0][1].metadata
    expect(metadata.selector).toEqual('deal-card > button')
  })
})

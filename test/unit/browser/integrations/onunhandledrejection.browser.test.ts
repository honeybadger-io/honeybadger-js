import onUnhandledRejection from '../../../../src/browser/integrations/onunhandledrejection'
// @ts-ignore
import { nullLogger, TestClient, TestTransport } from '../../helpers'

describe('window.onunhandledrejection integration', function () {
  let client, mockNotify

  beforeEach(function () {
    client = new TestClient({
      logger: nullLogger()
    }, new TestTransport())
    mockNotify = jest.fn()
    client.notify = mockNotify
  })

  it('skips install if window.onunhandledrejection isn\'t a property', function () {
    const window = {}
    onUnhandledRejection(window).load(client)
    expect(window['onunhandledrejection']).toBeUndefined()
  })

  it('reports error reason when specified', function () {
    const window = { onunhandledrejection: undefined }
    onUnhandledRejection(window).load(client)
    const reason = 'Honeybadgers!'
    window.onunhandledrejection({ reason })
    expect(mockNotify.mock.calls.length).toBe(1)
    expect(mockNotify.mock.calls[0][0]).toEqual(expect.objectContaining({
      name: 'window.onunhandledrejection',
      message: `UnhandledPromiseRejectionWarning: ${reason}`
    }))
  })

  it('reports default error reason if left unspecified', function () {
    const window = { onunhandledrejection: undefined }
    onUnhandledRejection(window).load(client)
    window.onunhandledrejection(jest.fn())
    expect(mockNotify.mock.calls.length).toBe(1)
    expect(mockNotify.mock.calls[0][0]).toEqual(expect.objectContaining({
      name: 'window.onunhandledrejection',
      message: 'UnhandledPromiseRejectionWarning: Unspecified reason'
    }))
  })
})


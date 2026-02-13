import onUnhandledRejection from '../../../../src/browser/integrations/onunhandledrejection'
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

  it('passes the Error directly to client.notify when reason is an Error', function () {
    const window = { onunhandledrejection: undefined }
    onUnhandledRejection(window).load(client)
    const reason = new Error('Test error')
    window.onunhandledrejection({ reason })
    expect(mockNotify.mock.calls.length).toBe(1)
    expect(mockNotify.mock.calls[0][0]).toBe(reason)
    expect(reason.message).toBe('UnhandledPromiseRejectionWarning: Test error')
  })

  it('sets a fallback stack when the Error has no stack', function () {
    const window = { onunhandledrejection: undefined }
    onUnhandledRejection(window).load(client)
    const reason = new Error('No stack')
    reason.stack = ''
    window.onunhandledrejection({ reason })
    expect(mockNotify.mock.calls.length).toBe(1)
    expect(mockNotify.mock.calls[0][0]).toBe(reason)
    expect(reason.stack).toBe('No stack\n    at ? (unknown:0)')
  })

  it('preserves custom properties on Error subclasses passed directly', function () {
    const window = { onunhandledrejection: undefined }
    onUnhandledRejection(window).load(client)

    class CustomError extends Error {
      skipReporting = true
      errorType = 'CUSTOM'
    }
    const reason = new CustomError('Custom error')

    window.onunhandledrejection({ reason })
    expect(mockNotify.mock.calls.length).toBe(1)

    const notifiedError = mockNotify.mock.calls[0][0]
    expect(notifiedError).toBe(reason)
    expect(notifiedError.skipReporting).toBe(true)
    expect(notifiedError.errorType).toBe('CUSTOM')
  })
})

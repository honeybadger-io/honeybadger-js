import { onError } from '../../../../src/browser/integrations/onerror'
import { nullLogger, TestClient, TestTransport } from '../../helpers'

describe('window.onerror integration', function () {
  let client, mockNotify, mockAddBreadcrumb

  beforeEach(function () {
    client = new TestClient({
      logger: nullLogger()
    }, new TestTransport())
    mockNotify = jest.fn()
    mockAddBreadcrumb = jest.fn()
    client.notify = mockNotify
    client.addBreadcrumb = mockAddBreadcrumb
  })

  it('adds config to client', function () {
    const window = {}
    onError(window).load(client)
    expect(client.config.enableUncaught).toEqual(true)
  })

  it('skips install if window.onerror isn\'t a property', function () {
    const window = {}
    onError(window).load(client)
    expect(window['onerror']).toBeUndefined()
  })

  it('installs first window.onerror handler', function () {
    const window = { onerror: undefined }
    onError(window).load(client)
    expect(window.onerror).toEqual(expect.any(Function))
  })

  it('wraps existing window.onerror handler', function () {
    const mockHandler = jest.fn()
    const window = { onerror: mockHandler }
    onError(window).load(client)
    expect(window.onerror).toEqual(expect.any(Function))
    expect(window.onerror).not.toEqual(mockHandler)
    window.onerror('testing', 'https://www.example.com/', '1', '0')
    expect(mockHandler.mock.calls.length).toBe(1)
  })

  it('reports errors when error object is unavailable', function () {
    const window = { onerror: undefined }
    onError(window).load(client)
    window.onerror('expected message', 'https://www.example.com/', '1')
    expect(mockNotify.mock.calls.length).toBe(1)
    expect(mockNotify.mock.calls[0][0]).toEqual(expect.objectContaining({
      name: 'window.onerror',
      message: 'expected message',
      stack: 'expected message\n    at ? (https://www.example.com/:1:0)'
    }))
  })

  it('reports error object when it is available', function () {
    const err = new Error('expected message')
    const window = { onerror: undefined }
    onError(window).load(client)
    window.onerror('testing', 'https://www.example.com/', '1', '0', err)
    expect(mockNotify.mock.calls.length).toBe(1)
    expect(mockNotify.mock.calls[0][0]).toEqual(expect.objectContaining({
      name: 'Error',
      message: 'expected message',
      stack: err.stack
    }))
  })

  it('reports non-error objects', function () {
    const window = { onerror: undefined }
    onError(window).load(client)
    window.onerror('testing', 'https://www.example.com/', '1', '0', 'expected message')
    expect(mockNotify.mock.calls.length).toBe(1)
    expect(mockNotify.mock.calls[0][0]).toEqual(expect.objectContaining({
      name: 'window.onerror',
      message: 'expected message',
      stack: 'expected message\n    at ? (https://www.example.com/:1:0)'
    }))
  })

  it('supplements minimial information', function () {
    const window = { onerror: undefined }
    onError(window).load(client)
    window.onerror(null, null, null, null, 'expected message')
    expect(mockNotify.mock.calls.length).toBe(1)
    expect(mockNotify.mock.calls[0][0]).toEqual(expect.objectContaining({
      name: 'window.onerror',
      message: 'expected message',
      stack: 'expected message\n    at ? (unknown:0:0)'
    }))
  })

  it('skips cross-domain script errors', function () {
    const window = { onerror: undefined }
    onError(window).load(client)
    window.onerror('Script error', 'https://www.example.com/', 0)
    expect(mockNotify.mock.calls.length).toBe(0)
  })

  it('reports breadcrumb', function () {
    const window = { onerror: undefined }
    onError(window).load(client)
    window.onerror('testing', 'https://www.example.com/', '1', '0', 'expected message')
    expect(mockAddBreadcrumb.mock.calls.length).toBe(1)
    expect(mockAddBreadcrumb.mock.calls[0][0]).toEqual('window.onerror')
    expect(mockAddBreadcrumb.mock.calls[0][1]).toEqual(expect.objectContaining({
      category: 'error',
      metadata: {
        name: 'window.onerror',
        message: 'expected message',
        stack: 'expected message\n    at ? (https://www.example.com/:1:0)'
      }
    }))
  })
})

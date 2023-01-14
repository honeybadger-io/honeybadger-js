import React, { ReactNode } from 'react'
import TestRenderer from 'react-test-renderer'
import { Honeybadger, HoneybadgerErrorBoundary } from './'
import { SinonSpy, assert, createSandbox } from 'sinon'
import fetch from 'jest-fetch-mock'

describe('HoneybadgerReact', () => {
  const config = { apiKey: 'FFAACCCC00' }
  const honeybadger = Honeybadger.configure(config)

  class Clean extends React.Component {
    render() {
      return <h1>Welcome! This works</h1>
    }
  }

  class Broken extends React.Component {
    render(): ReactNode {
      throw Error('Busted, sorry')
    }
  }

  const sandbox = createSandbox()
  beforeEach(function () {
    fetch.enableMocks()
    fetch.resetMocks()
    fetch.mockResponseOnce(JSON.stringify({ id: '12345' }), { status: 201 })
  })

  afterEach(function () {
    sandbox.restore()
  })

  function afterNotify (done: () => void, run: () => void, timeout = 50) {
    setTimeout(function () {
      run()
      done()
    }, timeout)
  }

  it('should render the default component when there are no errors', () => {
    const testRenderer = TestRenderer.create(<HoneybadgerErrorBoundary honeybadger={honeybadger}><Clean /></HoneybadgerErrorBoundary>)
    const testInstance = testRenderer.root
    expect(testInstance.findByType(Clean)).toBeDefined()
  })

  it("should invoke Honeybadger's notify when a component errors", (done) => {
    sandbox.spy(honeybadger, 'notify')
    TestRenderer.create(<HoneybadgerErrorBoundary honeybadger={honeybadger}><Broken /></HoneybadgerErrorBoundary>)
    afterNotify(done, function () {
      assert.calledOnce(honeybadger.notify as SinonSpy)
    })
  })

  describe('when no custom error component is available', () => {
    it('should render a default error message when a component errors', () => {
      const testRenderer = TestRenderer.create(<HoneybadgerErrorBoundary honeybadger={honeybadger}><Broken /></HoneybadgerErrorBoundary>)
      const testInstance = testRenderer.root
      expect(testInstance.findByProps({ className: 'error' })).toBeDefined()
    })
  })

  describe('when a custom error component is available', () => {
    it('should render a custom error message when a component errors', (done) => {
      sandbox.spy(honeybadger, 'notify')
      sandbox.spy(honeybadger, 'showUserFeedbackForm')

      const MyError = jest.fn(() => 'custom error view')
      TestRenderer.create(<HoneybadgerErrorBoundary honeybadger={honeybadger} ErrorComponent={MyError}><Broken /></HoneybadgerErrorBoundary>)
      expect(MyError).toBeCalledWith({
        error: expect.any(Error),
        info: { componentStack: expect.any(String) },
        errorOccurred: expect.any(Boolean)
      }, {})
      // Still want to ensure notify is only called once. The MyError component will be created twice by React.
      afterNotify(done, function () {
        assert.calledOnce(honeybadger.notify as SinonSpy)
        assert.notCalled(honeybadger.showUserFeedbackForm as SinonSpy)
      })
    })
  })

  describe('user feedback', () => {
    it('should show the user feedback form when an error occurs', (done) => {
      sandbox.spy(honeybadger, 'notify')
      sandbox.spy(honeybadger, 'showUserFeedbackForm')

      const MyError = jest.fn(() => 'custom error view')
      TestRenderer.create(<HoneybadgerErrorBoundary honeybadger={honeybadger} showUserFeedbackFormOnError={true} ErrorComponent={MyError}><Broken /></HoneybadgerErrorBoundary>)
      expect(MyError).toBeCalledWith({
        error: expect.any(Error),
        info: { componentStack: expect.any(String) },
        errorOccurred: expect.any(Boolean)
      }, {})
      // Still want to ensure notify is only called once. The MyError component will be created twice by React.
      afterNotify(done, function () {
        assert.calledOnce(honeybadger.notify as SinonSpy)
        assert.calledOnce(honeybadger.showUserFeedbackForm as SinonSpy)
      })
    })
  })
})

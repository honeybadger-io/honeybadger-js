import React, { ReactNode } from 'react'
import TestRenderer from 'react-test-renderer'
import packageJson from '../package.json'

// Need to import like this because react-scripts does not support jest's {@link https://jestjs.io/docs/configuration#resolver-string resolver} option.
// We need "resolver" to ask jest to respect the "browser" field in the package.json.
// Since we do not have that, we import here manually. The alternative would be to do "react-scripts eject", but that would be an overkill.
import Honeybadger from '@honeybadger-io/js/dist/browser/honeybadger'
import { Honeybadger as HoneybadgerUniversalType, HoneybadgerErrorBoundary } from './'
import { SinonSpy, assert, createSandbox } from 'sinon'
import fetch from 'jest-fetch-mock'

describe('HoneybadgerReact', () => {
  const config = { apiKey: 'FFAACCCC00' }
  // need to type cast to the universal type (both Server and Client) because that's what the component expects
  // in a real world scenario, the correct implementation is imported: Server in the case of SSR and Client in the browser
  const honeybadger = Honeybadger.configure(config) as HoneybadgerUniversalType

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

  it('should have the correct notifier name and version', () => {
    expect(honeybadger.notifier.name).toEqual(packageJson.name.replace('@', ''))
    expect(honeybadger.notifier.version).toEqual(packageJson.version)
  })

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

      const MyErrComponent = () => <>custom error</>
      const MyErrComponentMock = jest.fn(MyErrComponent) as jest.MockedFunction<typeof MyErrComponent>

      TestRenderer.create(<HoneybadgerErrorBoundary honeybadger={honeybadger} ErrorComponent={MyErrComponentMock}><Broken /></HoneybadgerErrorBoundary>)
      expect(MyErrComponentMock).toBeCalledWith({
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

      const MyErrComponent = () => <>custom error</>
      const MyErrComponentMock = jest.fn(MyErrComponent) as jest.MockedFunction<typeof MyErrComponent>

      TestRenderer.create(<HoneybadgerErrorBoundary honeybadger={honeybadger} showUserFeedbackFormOnError={true} ErrorComponent={MyErrComponentMock}><Broken /></HoneybadgerErrorBoundary>)
      expect(MyErrComponentMock).toBeCalledWith({
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

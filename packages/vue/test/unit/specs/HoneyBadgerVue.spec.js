import HoneybadgerVue from '../../../src/index'
import Honeybadger from '@honeybadger-io/js'
import Miniwolf from '../Miniwolf.vue'
import TestCanvasForProps from '../TestCanvasForProps.vue'
import { createSandbox } from 'sinon'
import fetch from 'jest-fetch-mock'
import { mount } from '@vue/test-utils'

describe('HoneybadgerVue', () => {
  let requests, xhr
  let sandbox

  const DUMMY_API_KEY = 'FFAACCCC00'

  function getAppInstance (wrapper) {
    return wrapper.__app
  }

  function getComponentInstance (wrapper) {
    return wrapper.vm
  }

  function getHoneybadgerConfig (appConfig = {}) {
    return {
      apiKey: DUMMY_API_KEY,
      enableUncaught: false,
      ...appConfig,
    }
  }

  function factory (rootComponent = {}, appConfig = {}) {
    return mount(rootComponent, {
      global: {
        plugins: [
          [HoneybadgerVue, getHoneybadgerConfig(appConfig)]
        ]
      }
    })
  }

  beforeEach(function () {
    process.env.NODE_ENV = 'test'

    jest.resetModules()

    global.console = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }

    sandbox = createSandbox()

    // Refresh singleton state.
    // Honeybadger.reset()

    fetch.resetMocks()
  })

  afterEach(function () {
    // xhr.restore()
    sandbox.restore()
  })

  function afterNotify (done, run) {
    setTimeout(function () {
      run()
      done()
    }, 50)
  }

  it('should bind the Honeybadger component to an app instance', () => {
    const wrapper = factory()
    const vm = getComponentInstance(wrapper)
    expect(vm.$honeybadger).toBe(Honeybadger)
  })

  it('should output debug information', () => {
    factory({}, { debug: true })
    expect(global.console.log).toHaveBeenCalledWith(`Honeybadger configured with ${DUMMY_API_KEY}`)
  })

  it('should not output debug information', () => {
    factory()
    expect(global.console.log).not.toHaveBeenCalled()
  })

  it('should add an errorHandler', () => {
    const wrapper = factory()
    const app = getAppInstance(wrapper)
    // Until we .use the plugin, the Vue errorHandler is of type "object."
    expect(typeof app.config.errorHandler).toEqual('function')
  })

  // The following two tests are failing because of a quirk of how the Sinon XmlHttpRequest constructor works. Because
  // that behavior is just different enough to throw an unexpected error when a string is passed to the constructor,
  // our options are:
  //   1) test only that Honeybadger's api is invoked
  //   2) patch Honeybadger-js to invoke the constructor differently
  //   3) patch Sinon to igore a string parameter in the constructor.
  //   4) use a different XmlHttpRequest Spy method instead of Sinon.
  // As long as we trust that Honeybadger-js works as expected we can punt for now.
  // it('should notify through Honeybadger', (done) => {
  //   Honeybadger.notify("don't care")
  //   afterNotify(done, function () {
  //     expect(requests.length).toEqual(1)
  //   })
  // })
  // it('should post an error to the configured destination and API key', (done) => {
  //   constructor.config.errorHandler(new Error('oops'), { $root: true, $options: {} }, 'some descriptive context')
  //   afterNotify(done, function () {
  //     expect(requests.length).toEqual(1)
  //   })
  // })

  it("should invoke Honeybadger's notify without logging error in console", (done) => {
    process.env.NODE_ENV = 'production'
    const wrapper = factory({}, { debug: false })
    const app = getAppInstance(wrapper)
    sandbox.spy(app.$honeybadger, 'notify')
    const err = new Error('oops')
    app.config.errorHandler(err, { $root: true, $options: {} }, 'some descriptive context')
    afterNotify(done, function () {
      expect(app.$honeybadger.notify.called).toBeTruthy()
      expect(global.console.error).not.toHaveBeenCalled()
    })
  })

  it("should invoke Honeybadger's notify and log error in console", (done) => {
    const wrapper = factory(Miniwolf, { debug: true })
    const app = getAppInstance(wrapper)
    sandbox.spy(app.$honeybadger, 'notify')
    const err = new Error('oops')
    app.config.errorHandler(err, { $root: true, $options: {} }, 'some descriptive context')
    afterNotify(done, function () {
      expect(app.$honeybadger.notify.called).toBeTruthy()
      expect(global.console.error).toHaveBeenCalled()
    })
  })

  it('should bubble up a rendering error to errorHandler', (done) => {
    const wrapper = factory(Miniwolf)
    const vm = getComponentInstance(wrapper)
    sandbox.spy(vm.$honeybadger, 'notify')
    wrapper.vm.makeSomethingUnrenderable()

    afterNotify(done, function () {
      expect(vm.$honeybadger.notify.called).toBeTruthy()
      expect(vm.$honeybadger.notify.calledOnce).toBeTruthy()
    })
  })
  describe('when a component has props', () => {
    it('should pass the props in the error notification', (done) => {
      const wrapper = factory(TestCanvasForProps)
      const vm = getComponentInstance(wrapper)
      sandbox.spy(vm.$honeybadger, 'notify')

      // need to mount component with valid data, so that we can call sandbox.spy
      // when that is done, we set the invalid data which will trigger the error
      wrapper.setData({ total: -1 })

      afterNotify(done, function () {
        expect(vm.$honeybadger.notify.called).toBeTruthy()
        sandbox.assert.calledWith(vm.$honeybadger.notify, sandbox.match.any, sandbox.match(
          { context: { vm: { props: { count: -1, title: 'Component 1' } } } })
        )
      })
    })
  })
})

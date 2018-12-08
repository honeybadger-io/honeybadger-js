import HoneybadgerVue from '@/index.js'
import Honeybadger from 'honeybadger-js'
import TestComponent from '../TestComponent.vue'
import TestCanvasForProps from '../TestCanvasForProps.vue'

describe('HoneybadgerVue', () => {
  var requests, xhr
  let Vue
  let sandbox

  function factory (config = {}) {
    return Vue.use(HoneybadgerVue, Object.assign({}, {
      apiKey: 'FFAACCCC00',
      onerror: false
    }, config))
  }

  beforeEach(function () {
    jest.resetModules()

    global.console = {
      log: jest.fn()
    }

    Vue = require('vue')

    sandbox = sinon.createSandbox()

    // Refresh singleton state.
    // Honeybadger.reset()

    // Stub HTTP requests.
    requests = []
    xhr = sandbox.useFakeXMLHttpRequest()

    xhr.onCreate = function (xhr) {
      return requests.push(xhr)
    }
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

  it('should bind the client when we add the Honeybadger component', () => {
    const constructor = factory()
    // const vm = new Constructor().$mount()
    expect(constructor.$honeybadger).toBe(Honeybadger)
  })

  it('Should output debug information', () => {
    Vue.config.debug = true
    factory()
    expect(global.console.log).toHaveBeenCalledWith('Honeybadger configured with FFAACCCC00')
  })

  it('Should not output debug information', () => {
    Vue.config.debug = false
    factory(Vue)

    expect(global.console.log).not.toHaveBeenCalled()
  })

  it('should add an errorHandler', () => {
    const constructor = factory()

    // Until we .use the plugin, the Vue errorHandler is of type "object."
    expect(typeof constructor.config.errorHandler).toEqual('function')
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

  it("should invoke Honeybadger's notify", (done) => {
    const constructor = factory()

    sandbox.spy(constructor.$honeybadger, 'notify')
    var err = new Error('oops')
    constructor.config.errorHandler(err, { $root: true, $options: {} }, 'some descriptive context')
    afterNotify(done, function () {
      expect(constructor.$honeybadger.notify.called).toBeTruthy()
    })
  })

  it('Should bubble up a rendering error to errorHandler', (done) => {
    const constructor = factory()
    sandbox.spy(constructor.$honeybadger, 'notify')
    const Tc = constructor.extend(TestComponent)
    const vm = new Tc().$mount()
    vm.makeSomethingUnrenderable()
    afterNotify(done, function () {
      expect(vm.$honeybadger.notify.called).toBeTruthy()
      expect(vm.$honeybadger.notify.calledOnce).toBeTruthy()
    })
  })
  describe('when a component has props', () => {
    it('should pass the props in the error notification', (done) => {
      const constructor = factory()
      sandbox.spy(constructor.$honeybadger, 'notify')
      const Tc = constructor.extend(TestCanvasForProps)
      const vm = new Tc().$mount()

      afterNotify(done, function () {
        expect(vm.$honeybadger.notify.called).toBeTruthy()
        sandbox.assert.calledWith(vm.$honeybadger.notify, sandbox.match.any, sandbox.match(
          { context: { vm: { props: { count: -1, title: 'Component 1' } } } })
        )
      })
    })
  })
})

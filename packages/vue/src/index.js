import Honeybadger from 'honeybadger-js'

const HoneybadgerVue = {
  install (Vue, options) {
    if (Vue.config.debug) {
      console.log(`Honeybadger configured with ${options.apiKey}`)
    }
    const honeybadger = Honeybadger.configure(options)
    Vue.$honeybadger = honeybadger
    Vue.prototype.$honeybadger = Vue.$honeybadger
    const chainedErrorHandler = Vue.config.errorHandler
    let extractContext = function (vm) {
      var options = typeof vm === 'function' && vm.cid != null ? vm.options : vm._isVue ? vm.$options ||
        vm.constructor.options : vm || {}
      var name = options.name || options._componentTag
      var file = options.__file
      return {
        isRoot: vm.$root === vm,
        name: name,
        props: options.propsData,
        parentVnodeTag: options._parentVnode ? options._parentVnode.tag : undefined,
        file: file
      }
    }
    Vue.config.errorHandler = (error, vm, info) => {
      honeybadger.notify(error, {context: { vm: extractContext(vm), info: info }})
      if (typeof chainedErrorHandler === 'function') {
        chainedErrorHandler.call(this.Vue, error, vm, info)
      }
    }
  }
}

export default HoneybadgerVue

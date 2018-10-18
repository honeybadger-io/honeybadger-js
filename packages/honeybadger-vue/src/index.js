import HoneyBadger from 'honeybadger-js'

const HoneyBadgerVue = {
  install (Vue, options) {
    console.log('Configuring with ' + options.api_key)
    const honeybadger = HoneyBadger.configure(options)
    Vue.honeybadger = honeybadger
    Vue.prototype.honeybadger = Vue.honeybadger
    const chainedErrorHandler = Vue.config.errorHandler
    let extractContext = function (vm) {
      var options = typeof vm === 'function' && vm.cid != null ? vm.options : vm._isVue ? vm.$options ||
        vm.constructor.options : vm || {}
      var name = options.name || options._componentTag
      var file = options.__file

      return {
        isRoot: vm.$root === vm,
        name: name,
        props: vm.$props,
        file: file
      }
    }
    Vue.config.errorHandler = (error, vm, info) => {
      console.log('we are erroring.')
      console.log(vm)
      honeybadger.notify(error, {context: { vm: extractContext(vm), info: info }})
      if (typeof chainedErrorHandler === 'function') {
        chainedErrorHandler.call(this.Vue, error, vm, info)
      }
    }
    // window.addEventListener('error', event => {
    //   console.log('Captured in error EventListener', event.error)
    // })
    // window.addEventListener('unhandledrejection', event => {
    //   console.log('Captured in unhandledrejection EventListener', event.reason)
    // })
  }
}

export default HoneyBadgerVue

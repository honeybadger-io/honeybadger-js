import Vue from 'vue'
import App from './App.vue'
import HoneybadgerVue from '../../../src/index'

const config = {
  debug: true,
  apiKey: prompt('Enter the API key for your Honeybadger project:')
}
Vue.use(HoneybadgerVue, config)

new Vue({
  render: (h) => h(App),
}).$mount('#app')

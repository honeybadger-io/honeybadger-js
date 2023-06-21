import Vue from 'vue'
import App from './App.vue'
import HoneybadgerVue from '@honeybadger-io/vue'

const config = {
  debug: true,
  apiKey: prompt('Enter the API key for your Honeybadger project:')
}
Vue.use(HoneybadgerVue, config)

new Vue({
  render: (h) => h(App),
}).$mount('#app')

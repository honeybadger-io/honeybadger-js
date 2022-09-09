import { createApp } from 'vue'
import App from './App.vue'
import HoneybadgerVue from '../../../src/index'

const app = createApp(App)

const config = {
  debug: true,
  apiKey: prompt('Enter the API key for your Honeybadger project:')
}
app.use(HoneybadgerVue, config)

app.mount('#app')

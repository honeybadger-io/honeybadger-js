import { createApp } from 'vue'
import App from './App.vue'
import HoneybadgerVue from '@honeybadger-io/vue'

const app = createApp(App)

const config = {
  debug: true,
  apiKey: prompt('Enter the API key for your Honeybadger project:')
}
app.use(HoneybadgerVue, config)

app.mount('#app')

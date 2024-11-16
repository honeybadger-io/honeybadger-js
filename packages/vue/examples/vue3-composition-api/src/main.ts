import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import HoneybadgerVue from '@honeybadger-io/vue'

const app = createApp(App)

const config = {
  debug: true,
  reportData: false,
  apiKey: '80ee8156'
}
app.use(HoneybadgerVue, config)

app.mount('#app')

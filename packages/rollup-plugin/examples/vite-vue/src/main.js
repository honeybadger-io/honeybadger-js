import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import HoneybadgerVue from '@honeybadger-io/vue'

const app = createApp(App)

const config = {
  apiKey: import.meta.env.VITE_HONEYBADGER_API_KEY, 
  revision: import.meta.env.VITE_HONEYBADGER_REVISION,
}
app.use(HoneybadgerVue, config)

app.mount('#app')

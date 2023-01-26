import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// Using the local built version of our plugin to test
import honeybadgerRollupPlugin from '../../dist/es/index.js';
import * as dotenv from 'dotenv' 
dotenv.config({ path: `.env.local` })

// Put your API_KEY etc in a .env.local file
const hbPluginOptions = {
  apiKey: process.env.VITE_HONEYBADGER_API_KEY, 
  assetsUrl: process.env.VITE_HONEYBADGER_ASSETS_URL,
  revision: process.env.VITE_HONEYBADGER_REVISION,
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    sourcemap: true,
    rollupOptions: {
      plugins: [ honeybadgerRollupPlugin(hbPluginOptions) ]
    }
  }
})


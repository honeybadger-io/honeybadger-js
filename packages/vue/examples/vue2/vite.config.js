import { defineConfig } from 'vite'
const { createVuePlugin } = require('vite-plugin-vue2')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [createVuePlugin()]
})

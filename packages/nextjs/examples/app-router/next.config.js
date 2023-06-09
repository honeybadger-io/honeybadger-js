const { setupHoneybadger } = require('../../dist/honeybadger-nextjs.cjs')

const moduleExports = {
  // ... Your existing module.exports object goes here
  productionBrowserSourceMaps: true,
  experimental: {
    appDir: true,
  },
}

// Showing default values
const honeybadgerNextJsConfig = {
  disableSourceMapUpload: false,
  silent: false,
  webpackPluginOptions: {
    apiKey: process.env.NEXT_PUBLIC_HONEYBADGER_API_KEY,
    assetsUrl: process.env.NEXT_PUBLIC_HONEYBADGER_ASSETS_URL,
    revision: process.env.NEXT_PUBLIC_HONEYBADGER_REVISION,
  }
}

module.exports = setupHoneybadger(moduleExports, honeybadgerNextJsConfig)

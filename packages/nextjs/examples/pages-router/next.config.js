// const { setupHoneybadger } = require('../../dist/honeybadger-nextjs.cjs')
const { setupHoneybadger } = require('@honeybadger-io/nextjs')

const moduleExports = {
  // ... Your existing module.exports object goes here
}

// Showing default values
const honeybadgerNextJsConfig = {
  // Disable source map upload (optional)
  disableSourceMapUpload: false,

  // Hide debug messages (optional)
  silent: false,

  // More information available at @honeybadger-io/webpack: https://github.com/honeybadger-io/honeybadger-js/tree/master/packages/webpack
  webpackPluginOptions: {
    // Required if you want to upload source maps to Honeybadger
    apiKey: process.env.NEXT_PUBLIC_HONEYBADGER_API_KEY,

    // Required if you want to upload source maps to Honeybadger
    assetsUrl: process.env.NEXT_PUBLIC_HONEYBADGER_ASSETS_URL,

    revision: process.env.NEXT_PUBLIC_HONEYBADGER_REVISION,
    endpoint: 'https://api.honeybadger.io/v1/source_maps',
    ignoreErrors: false,
    retries: 3,
    workerCount: 5,
    deploy: {
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV || process.env.NODE_ENV,
      repository: 'https://github.com/honeybadger-io/nextjs-with-honeybadger',
      localUsername: 'subzero10'
    }
  }
}

module.exports = setupHoneybadger(moduleExports, honeybadgerNextJsConfig)

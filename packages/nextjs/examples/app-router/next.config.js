// const { withHoneybadgerConfig } = require('../../dist/honeybadger-nextjs.cjs')
const { withHoneybadgerConfig } = require('@honeybadger-io/nextjs')

const moduleExports = {
  // ... Your existing module.exports object goes here
  //
  // `productionBrowserSourceMaps` is deliberately not set here. When source map upload is
  // configured, withHoneybadgerConfig turns it on so there is something to upload, then
  // deletes the maps from the build output once they have been sent — so they are not
  // served to visitors. Setting it yourself opts out of that and keeps them served.
  experimental: {
    appDir: true,
  },
}

// Showing default values
const honeybadgerNextJsConfig = {
  disableSourceMapUpload: false,
  silent: false,
  apiKey: process.env.NEXT_PUBLIC_HONEYBADGER_API_KEY,
  assetsUrl: process.env.NEXT_PUBLIC_HONEYBADGER_ASSETS_URL,
  revision: process.env.NEXT_PUBLIC_HONEYBADGER_REVISION,
}

module.exports = withHoneybadgerConfig(moduleExports, honeybadgerNextJsConfig)

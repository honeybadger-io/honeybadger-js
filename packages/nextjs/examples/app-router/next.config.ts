import type { NextConfig } from 'next'
import { withHoneybadgerConfig, type HoneybadgerNextJsConfig } from '@honeybadger-io/nextjs'

const nextConfig: NextConfig = {
  // `productionBrowserSourceMaps` and `experimental.serverSourceMaps` are deliberately not
  // set here. When source map upload is configured, withHoneybadgerConfig turns both on so
  // there is something to upload, then deletes the browser maps from the build output once
  // they have been sent — so they are not served to visitors. Setting either yourself opts
  // out of that and keeps your maps exactly as you configured them.
}

// Showing default values
const honeybadgerConfig: HoneybadgerNextJsConfig = {
  disableSourceMapUpload: false,
  silent: false,
  apiKey: process.env.NEXT_PUBLIC_HONEYBADGER_API_KEY,
  assetsUrl: process.env.NEXT_PUBLIC_HONEYBADGER_ASSETS_URL,
  revision: process.env.NEXT_PUBLIC_HONEYBADGER_REVISION,
}

export default withHoneybadgerConfig(nextConfig, honeybadgerConfig)

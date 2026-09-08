import Honeybadger from '@honeybadger-io/js'

export const config = {
  apiKey: process.env.NEXT_PUBLIC_HONEYBADGER_API_KEY,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV || process.env.NODE_ENV,
  revision: process.env.NEXT_PUBLIC_HONEYBADGER_REVISION,
  // debug: true,
  // reportData: true,
  insights: { enabled: true, http: true },
}

// `projectRoot` used to be pinned to 'webpack:///./' here, and a beforeNotify handler
// rewrote `.next/server` paths to sit under the assets URL. Both were workarounds for
// matching webpack's source map paths, and neither survives Turbopack — it emits relative
// filesystem paths rather than `webpack://` URLs. Server-side frame matching is tracked in
// https://github.com/honeybadger-io/honeybadger-js/issues/1602
Honeybadger.configure(config)
Honeybadger.logger.debug('Honeybadger configured for server')

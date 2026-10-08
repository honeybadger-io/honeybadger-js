import Honeybadger from '@honeybadger-io/js'

export const config = {
  apiKey: process.env.NEXT_PUBLIC_HONEYBADGER_API_KEY,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV || process.env.NODE_ENV,
  revision: process.env.NEXT_PUBLIC_HONEYBADGER_REVISION,
  // debug: true,
  // reportData: true,
  insights: { enabled: true, http: true },
}

// Server-side frames are not symbolicated yet: the paths reported at runtime do not match
// the source maps uploaded for `.next/server`. Tracked in
// https://github.com/honeybadger-io/honeybadger-js/issues/1602
Honeybadger.configure(config)
Honeybadger.logger.debug('Honeybadger configured for server')

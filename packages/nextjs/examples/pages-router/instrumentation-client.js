import Honeybadger from '@honeybadger-io/js'

export const config = {
  apiKey: process.env.NEXT_PUBLIC_HONEYBADGER_API_KEY,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV || process.env.NODE_ENV,
  revision: process.env.NEXT_PUBLIC_HONEYBADGER_REVISION,
  debug: true,
  // reportData: true,
}

// This file runs after the document loads but before React hydrates, so the client is
// instrumented before any component code can throw. It replaces the
// honeybadger.browser.config.js that the webpack plugin used to inject.
//
// `onRouterTransitionStart` is deliberately not exported here: it is an App Router hook, so
// it would never be called in this example.
Honeybadger.configure(config)
Honeybadger.logger.debug('Honeybadger configured for browser')

import { Honeybadger } from '@honeybadger-io/react'

export const config = {
  apiKey: process.env.NEXT_PUBLIC_HONEYBADGER_API_KEY,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV || process.env.NODE_ENV,
  revision: process.env.NEXT_PUBLIC_HONEYBADGER_REVISION,
  projectRoot: 'webpack://_N_E/./',
  // debug: true,
  // reportData: true,
}

// This file runs after the document loads but before React hydrates, so the client is
// instrumented before any component code can throw.
Honeybadger.configure(config)
Honeybadger.logger.debug('Honeybadger configured for browser')

/**
 * Records App Router navigations as breadcrumbs, which gives faults a trail of the
 * routes the user visited before the error.
 */
export function onRouterTransitionStart(url, navigationType) {
  Honeybadger.addBreadcrumb(`Navigated to ${url}`, {
    category: 'navigation',
    metadata: { url, navigationType },
  })
}

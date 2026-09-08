import { captureRequestError } from '@honeybadger-io/nextjs'

/**
 * Runs once per server instance, before any request is handled. This is how Honeybadger is
 * configured under both Turbopack and webpack — it replaces the old webpack entry-point
 * injection, which Turbopack ignored entirely.
 */
export async function register() {
  await import('./honeybadger.server.config')
}

/**
 * Reports server errors to Honeybadger, including from API routes and
 * `getServerSideProps` — which the `_error.js` approach could not reach.
 */
export const onRequestError = captureRequestError

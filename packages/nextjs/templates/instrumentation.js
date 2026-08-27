import { captureRequestError } from '@honeybadger-io/nextjs'

/**
 * Runs once per server instance, before any request is handled.
 * This is how Honeybadger is configured under both Turbopack and webpack.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./honeybadger.edge.config')
  } else {
    await import('./honeybadger.server.config')
  }
}

/**
 * Reports server errors to Honeybadger. Covers Server Components, Route Handlers,
 * Server Actions, middleware and the edge runtime — including API routes.
 */
export const onRequestError = captureRequestError

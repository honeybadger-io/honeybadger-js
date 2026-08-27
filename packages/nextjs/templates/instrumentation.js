import { captureRequestError } from '@honeybadger-io/nextjs'

/**
 * Runs once per server instance, before any request is handled. This is how Honeybadger
 * is configured under both Turbopack and webpack — it replaces the old webpack
 * entry-point injection, which Turbopack ignored.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./honeybadger.edge.config')
  } else {
    await import('./honeybadger.server.config')
  }

  // Optional: send a `request.handled` Insights event for every request, including
  // successful ones. This needs @vercel/otel installed, since Next.js emits the
  // request data as OpenTelemetry spans:
  //
  //   npm install @vercel/otel @opentelemetry/api
  //
  // then uncomment the import above and the call below.
  //
  // import { registerHoneybadgerInsights } from '@honeybadger-io/nextjs'
  // await registerHoneybadgerInsights()
  //
  // If you already call registerOTel() yourself, add honeybadgerSpanProcessor() to its
  // spanProcessors instead — registering OpenTelemetry twice competes for the provider.
}

/**
 * Reports server errors to Honeybadger. Covers Server Components, Route Handlers,
 * Server Actions, middleware and the edge runtime — including API routes, which the
 * previous error-component approach could not reach.
 */
export const onRequestError = captureRequestError

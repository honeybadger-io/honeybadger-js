import { captureRequestError } from '@honeybadger-io/nextjs'
// Uncomment for Insights request events — see register() below.
// import { registerHoneybadgerInsights } from '@honeybadger-io/nextjs'

/**
 * Runs once per server instance, before any request is handled. This is how Honeybadger
 * is configured, under both Turbopack and webpack.
 */
export async function register() {
  await import('./honeybadger.server.config')

  // Optional: send a `request.handled` Insights event for every request, including
  // successful ones. Next.js emits the request data as OpenTelemetry spans, so this needs:
  //
  //   npm install @vercel/otel @opentelemetry/api
  //
  // Then uncomment the import at the top of this file and the call below.
  //
  // await registerHoneybadgerInsights()
  //
  // If you already call registerOTel() yourself, add honeybadgerSpanProcessor() to its
  // spanProcessors instead — registering OpenTelemetry twice competes for the provider.
}

/**
 * Reports server errors to Honeybadger. Covers Server Components, Route Handlers,
 * Server Actions, middleware and API routes.
 */
export const onRequestError = captureRequestError

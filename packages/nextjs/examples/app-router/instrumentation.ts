import { captureRequestError, registerHoneybadgerInsights } from '@honeybadger-io/nextjs'

/**
 * Runs once per server instance, before any request is handled. This is how Honeybadger is
 * configured under both Turbopack and webpack — it replaces the old webpack entry-point
 * injection, which Turbopack ignored entirely.
 */
export async function register() {
  await import('./honeybadger.server.config')

  // Sends a `request.handled` Insights event for every request, including successful ones.
  // Needs @vercel/otel and @opentelemetry/api, because Next.js emits the request data as
  // OpenTelemetry spans. If you already call registerOTel() yourself, add
  // honeybadgerSpanProcessor() to its spanProcessors instead — registering OpenTelemetry
  // twice competes for the provider.
  await registerHoneybadgerInsights()
}

/**
 * Reports server errors to Honeybadger. Covers Server Components, Route Handlers, Server
 * Actions and middleware — including API routes, which the error-component approach this
 * replaces could never reach.
 */
export const onRequestError = captureRequestError

import { captureRequestError, registerHoneybadgerInsights } from '@honeybadger-io/nextjs'

/**
 * Runs once per server instance, before any request is handled. This is how Honeybadger is
 * configured, under both Turbopack and webpack.
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
 * Actions, middleware and API routes.
 */
export const onRequestError = captureRequestError

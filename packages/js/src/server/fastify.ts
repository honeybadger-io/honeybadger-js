/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FastifyPluginCallback, FastifyReply, FastifyRequest } from 'fastify'
import { Client, Util } from '@honeybadger-io/core'
import {
  buildRequestEventPayload,
  durationMs,
  seedRequestEventContext,
  startTimer,
} from './instrumentation/http_event'

// The subset of the server Honeybadger client used by the plugin: the core
// client plus the server-only per-request store entry point. Typed
// structurally (instead of importing the server singleton) so the emitted
// declaration file doesn't reference the bundled `../server` module, which
// doesn't resolve from `dist/`.
type ServerClient = Client & {
  withRequest<R>(
    request: Record<symbol, unknown>,
    handler: (...args: never[]) => R,
    onError?: (...args: unknown[]) => unknown
  ): R | void
}

// Minimal callable for the lazily-required `fastify-plugin` wrapper. Its real
// type definitions are deliberately not imported: they add nothing to the
// public signature and would widen the set of fastify type files our build
// has to parse.
type FastifyPluginWrapper = (
  plugin: FastifyPluginCallback,
  opts: { name: string }
) => FastifyPluginCallback

const kHbStart = Symbol('honeybadger.start')

// `fastify-plugin` is an optional peer dependency: only Fastify users need it,
// so it is resolved lazily when the factory is called (same pattern as the
// `async_hooks` require in ./async_store.ts).
function requireFastifyPlugin(): FastifyPluginWrapper {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fp = require('fastify-plugin')
    return fp.default ?? fp
  } catch (_e) {
    throw new Error(
      '@honeybadger-io/js: fastifyPlugin requires the `fastify-plugin` package. ' +
      'Install it in your application: npm install fastify-plugin'
    )
  }
}

/**
 * Returns a Fastify plugin bound to the given Honeybadger client.
 *
 * Exposed as a factory (rather than a method on the singleton) so the
 * framework-specific code stays off the client API:
 *
 *     const { fastifyPlugin } = require('@honeybadger-io/js/dist/server/fastify')
 *     fastify.register(fastifyPlugin(Honeybadger))
 *
 * Requires the `fastify-plugin` package (declared as an optional peer
 * dependency of this package) — the factory throws with install instructions
 * when it cannot be resolved. The returned plugin is wrapped with
 * `fastify-plugin`, so its hooks apply to the calling context rather than
 * being encapsulated.
 *
 * The plugin runs every request inside `client.withRequest(req, ...)`, seeding
 * `request_id` / `correlation_id` on the event context. When
 * `insights.enabled` and `insights.http` are both true it also emits a
 * `request.handled` event per request with method, path, route, status and
 * duration.
 *
 * Supports Fastify 3+.
 */
export function fastifyPlugin(client: ServerClient): FastifyPluginCallback {
  const fp = requireFastifyPlugin()

  const plugin: FastifyPluginCallback = (fastify, _opts, done) => {
    fastify.addHook('onRequest', (req: FastifyRequest, _reply: FastifyReply, hookDone: () => void) => {
      client.withRequest(req as unknown as Record<symbol, unknown>, () => {
        client.setEventContext(seedRequestEventContext(req.headers))
        if (Util.resolveInsights(client.config).http) {
          (req as any)[kHbStart] = startTimer()
        }
        hookDone()
      })
    })

    fastify.addHook('onResponse', (req: FastifyRequest, reply: FastifyReply, hookDone: () => void) => {
      // `withRequest` keys store contents off the request object, so this
      // re-entry shares the contents populated in `onRequest` — the event
      // payload below picks up `request_id` / `correlation_id` (and any
      // context the user set during the route handler).
      client.withRequest(req as unknown as Record<symbol, unknown>, () => {
        if (Util.resolveInsights(client.config).http && (req as any)[kHbStart] != null) {
          client.event('request.handled', buildRequestEventPayload({
            method: req.method,
            path: typeof req.url === 'string' ? req.url.split('?')[0] : req.url,
            route: (req as any).routeOptions?.url ?? (req as any).routerPath,
            status: reply.statusCode,
            duration: durationMs((req as any)[kHbStart]),
          }))
        }
        hookDone()
      })
    })

    done()
  }

  return fp(plugin, { name: '@honeybadger-io/js' })
}

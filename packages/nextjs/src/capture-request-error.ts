import Honeybadger from '@honeybadger-io/js';
import { scheduleFlush } from './flush';
import { seedNodeRequestEventContext } from './insights-instrumentation';
import type { NodeHeaders } from './insights-instrumentation';

/**
 * The shape Next.js passes to `onRequestError`. Declared locally rather than imported
 * from `next` so the edge bundle carries no type-only dependency on the router types.
 * `headers` is a Node-style bag, which is exactly `NodeHeaders`, so the existing
 * header reader and the `request_id` / `correlation_id` precedence are reused as-is.
 */
export type RequestErrorRequest = {
  path: string
  method: string
  headers: NodeHeaders
}

export type RequestErrorContext = {
  routerKind: string
  routePath: string
  routeType: string
  renderSource?: string
  revalidateReason?: string
  renderType?: string
}

/**
 * Next.js uses thrown errors for control flow: `redirect()`, `notFound()`,
 * `forbidden()` and `unauthorized()` all throw an error carrying a `digest`
 * string (`NEXT_REDIRECT;...`, `NEXT_NOT_FOUND`, `NEXT_HTTP_ERROR_FALLBACK;...`).
 * These are not real failures — the framework catches them upstream to produce
 * the redirect/404/etc. — so we must let them pass without reporting, otherwise
 * every redirect shows up as an error in Honeybadger.
 *
 * We match on the `NEXT_` prefix rather than an exhaustive list so that any
 * present or future framework control-flow digest is covered. This is safe:
 * genuine errors that React tags with a `digest` use an opaque hash, and other
 * Next.js bailout signals (e.g. `BAILOUT_TO_CLIENT_SIDE_RENDERING`,
 * `DYNAMIC_SERVER_USAGE`) are not `NEXT_`-prefixed, so neither is skipped.
 */
function isNextControlFlowError(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null | undefined)?.digest
  return typeof digest === 'string' && digest.startsWith('NEXT_')
}

/**
 * Reports errors passed to Next.js's `onRequestError` instrumentation hook.
 *
 * Wire it up in `instrumentation.ts`:
 *
 * ```ts
 * export const onRequestError = captureRequestError
 * ```
 *
 * This replaces the old `withHoneybadger` handler wrapper. Unlike that wrapper — and
 * unlike the error-component approach it also replaces — this reaches Server Components,
 * Route Handlers, Server Actions, middleware and the edge runtime, and it receives the
 * real error rather than the generic message Next.js hands to an error component.
 */
export async function captureRequestError(
  error: unknown,
  request: RequestErrorRequest,
  context: RequestErrorContext
): Promise<void> {
  if (isNextControlFlowError(error)) {
    return
  }

  // Same header precedence as the Insights path, so a fault and the events from the
  // request it failed in carry matching ids.
  const ids = seedNodeRequestEventContext(request.headers)
  Honeybadger.setEventContext(ids)

  await Honeybadger.notifyAsync(error as Error, {
    context: {
      ...ids,
      path: request.path,
      method: request.method,
      router_kind: context.routerKind,
      route_path: context.routePath,
      route_type: context.routeType,
    },
  })

  await scheduleFlush({ useAfter: true })
}

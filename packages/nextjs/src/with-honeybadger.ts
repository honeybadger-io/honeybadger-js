import Honeybadger from '@honeybadger-io/js';
import { NextRequest, NextResponse } from 'next/server';
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  emitNodeRequestEvent,
  emitRequestEvent,
  insightsHttpEnabled,
  now,
  seedNodeRequestEventContext,
  seedRequestEventContext,
} from './insights-instrumentation';
import type { NodeRequestLike } from './insights-instrumentation';

function configure(overrides?: Parameters<typeof Honeybadger.configure>[0]) {
  if (Honeybadger.config.apiKey?.length > 0) {
    return;
  }

  let projectRoot: string | undefined = undefined;
  try {
    // not available on edge runtime
    projectRoot = process.cwd();
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  catch (error) {
    // do nothing
  }

  Honeybadger
    .configure({
      apiKey: process.env.NEXT_PUBLIC_HONEYBADGER_API_KEY,
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV || process.env.NODE_ENV,
      revision: process.env.NEXT_PUBLIC_HONEYBADGER_REVISION,
      projectRoot: 'webpack://_N_E/./',
      ...overrides,
    })
    .beforeNotify((notice) => {
      if (!projectRoot) {
        return
      }

      notice?.backtrace.forEach((line) => {
        if (line.file) {
          line.file = line.file.replace(`${projectRoot}/.next/server`, `${process.env.NEXT_PUBLIC_HONEYBADGER_ASSETS_URL}/..`)
        }
        return line
      })
    })
}

/**
 * Next.js uses thrown errors for control flow: `redirect()`, `notFound()`,
 * `forbidden()` and `unauthorized()` all throw an error carrying a `digest`
 * string (`NEXT_REDIRECT;...`, `NEXT_NOT_FOUND`, `NEXT_HTTP_ERROR_FALLBACK;...`).
 * These are not real failures — the framework catches them upstream to produce
 * the redirect/404/etc. — so we must let them propagate without reporting them,
 * otherwise every redirect shows up as an error in Honeybadger.
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

type AppRouterHandler = (req: NextRequest | Request, ...args: unknown[]) => Promise<NextResponse>
type PagesApiHandler = (req: NextApiRequest, res: NextApiResponse, ...args: unknown[]) => unknown

/**
 * Detects a Pages Router API invocation: `(req, res)` where `res` is a Node
 * `ServerResponse`. We branch on this structurally because — unlike an App
 * Router route handler — there is no returned `Response` to read the status
 * from; it lives on `res.statusCode`.
 */
function isPagesApiInvocation(args: unknown[]): args is [NodeRequestLike, NextApiResponse] {
  const req = args[0] as { headers?: unknown } | undefined
  const res = args[1] as { statusCode?: unknown; end?: unknown } | undefined
  return (
    !!req && typeof req.headers === 'object' && req.headers !== null &&
    !!res && typeof res.statusCode === 'number' && typeof res.end === 'function'
  )
}

/**
 * App Router route handlers and middleware: a web `Request`/`NextRequest` in, a
 * `Response`/`NextResponse` out. The status comes from the returned response.
 */
async function handleAppRouterRequest(call: () => unknown, req: Request, canIsolate: boolean): Promise<unknown> {
  const ids = seedRequestEventContext(req.headers)
  if (canIsolate) {
    Honeybadger.setEventContext(ids)
  }
  const start = insightsHttpEnabled() ? now() : null
  try {
    const response = await call()
    if (start !== null) {
      emitRequestEvent(req, (response as Response | undefined)?.status, start, ids)
    }
    return response
  } catch (error) {
    if (isNextControlFlowError(error)) {
      throw error
    }
    if (start !== null) {
      emitRequestEvent(req, 500, start, ids)
    }
    await Honeybadger.notifyAsync(error as Error)
    throw error
  }
}

/**
 * Pages Router API routes: a Node `req`/`res` pair. The handler writes to `res`
 * and returns nothing meaningful, so the final status is read from
 * `res.statusCode` once it resolves.
 */
async function handlePagesApiRequest(call: () => unknown, req: NodeRequestLike, res: NextApiResponse, canIsolate: boolean): Promise<unknown> {
  const ids = seedNodeRequestEventContext(req.headers)
  if (canIsolate) {
    Honeybadger.setEventContext(ids)
  }
  const start = insightsHttpEnabled() ? now() : null
  try {
    const result = await call()
    if (start !== null) {
      emitNodeRequestEvent(req, res.statusCode, start, ids)
    }
    return result
  } catch (error) {
    if (isNextControlFlowError(error)) {
      throw error
    }
    if (start !== null) {
      emitNodeRequestEvent(req, 500, start, ids)
    }
    await Honeybadger.notifyAsync(error as Error)
    throw error
  }
}

/**
 * Unrecognised invocation shape: still report errors, but emit no insights
 * event since we can't reliably read the request.
 */
async function handleUninstrumented(call: () => unknown): Promise<unknown> {
  try {
    return await call()
  } catch (error) {
    if (isNextControlFlowError(error)) {
      throw error
    }
    await Honeybadger.notifyAsync(error as Error)
    throw error
  }
}

/**
 * Wraps a handler function with Honeybadger error reporting. Works with App
 * Router route handlers, middleware, and Pages Router API routes.
 *
 * `request_id` / `correlation_id` are read from the `x-request-id` /
 * `request-id` and `x-correlation-id` / `x-amzn-trace-id` headers (generated
 * when absent). When `insights: { enabled: true, http: true }` is configured,
 * a `request.handled` event carrying the ids plus method, path, status and
 * duration is emitted per request.
 *
 * On the Node.js runtime each invocation additionally runs inside
 * `Honeybadger.run(...)`, so context is isolated per request and the ids are
 * seeded onto the event context — merged onto every event emitted during the
 * request, including programmatic `Honeybadger.event(...)` calls. On the edge
 * runtime (browser build, single global store) seeding the shared event
 * context would leak ids between concurrent requests, so programmatic events
 * there don't inherit them.
 *
 * The webpack config-file auto-injection (`honeybadger.*.config.js`) doesn't
 * reach API routes or edge middleware, so pass `config` to configure
 * Honeybadger explicitly there. It's ignored if Honeybadger is already
 * configured (e.g. by the auto-injected file).
 */
export function withHoneybadger(handler: AppRouterHandler, config?: Parameters<typeof Honeybadger.configure>[0]): AppRouterHandler
export function withHoneybadger(handler: PagesApiHandler, config?: Parameters<typeof Honeybadger.configure>[0]): PagesApiHandler
export function withHoneybadger(handler: AppRouterHandler | PagesApiHandler, config?: Parameters<typeof Honeybadger.configure>[0]) {
  configure(config);
  return new Proxy(handler, {
    apply: (target, thisArg, args) => {
      const canIsolate = typeof Honeybadger.run === 'function'
      const call = () => Reflect.apply(target, thisArg, args)

      const invoke = (): unknown => {
        // App Router / middleware first: a web Request as the first argument.
        if (typeof Request !== 'undefined' && args[0] instanceof Request) {
          return handleAppRouterRequest(call, args[0], canIsolate)
        }
        // Pages Router API route: a Node req/res pair.
        if (isPagesApiInvocation(args)) {
          return handlePagesApiRequest(call, args[0], args[1], canIsolate)
        }
        return handleUninstrumented(call)
      }

      return canIsolate ? Honeybadger.run(invoke) : invoke()
    },
  });
}

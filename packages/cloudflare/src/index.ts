import Honeybadger from '@honeybadger-io/js'
import type { Types } from '@honeybadger-io/core'

const HANDLER_NAMES = ['fetch', 'scheduled', 'queue', 'email', 'tail'] as const

function isHbConfigured() {
  if (Honeybadger.config.apiKey === null || Honeybadger.config.apiKey === undefined) {
    return false;
  }

  return Honeybadger.config.apiKey.length > 0
}

function reportError(error: unknown, notice: Partial<Types.Notice> = {}): Promise<void> {
  if (!isHbConfigured()) {
    return Promise.resolve()
  }
  const noticeable = error instanceof Error ? error : new Error(String(error))
  return Honeybadger.notifyAsync(noticeable, notice)
}

/**
 * The url without its query string.
 *
 * `request.url` is absolute in a Worker, query string included, and context is never
 * filtered -- it is the user's own bag. The full url goes on the notice instead, where the
 * configured `filters` are applied to it.
 */
function urlWithoutQuery(url: string): string {
  return typeof url === 'string' ? url.split('?')[0] : url
}

export function withHoneybadger<Env>(
  getConfig: (env: Env) => Partial<Types.Config>,
  handler: ExportedHandler<Env>
): ExportedHandler<Env> {
  for (const name of HANDLER_NAMES) {
    const fn = handler[name as keyof ExportedHandler<Env>]
    if (typeof fn !== 'function') {
      continue
    }
    if (name === 'fetch') {
      const fetchHandler = fn as NonNullable<ExportedHandler<Env>['fetch']>
      handler.fetch = async (request, env, ctx) => {
        const config = getConfig(env)
        if (config.apiKey) {
          if (!isHbConfigured()) {
            Honeybadger.configure(config)
          }
          Honeybadger.setContext({ url: urlWithoutQuery(request.url), method: request.method })
        }
        try {
          return await fetchHandler(request, env, ctx)
        } catch (error: unknown) {
          ctx.waitUntil(reportError(error, { url: request.url }))
          throw error
        }
      }
      continue
    }

    if (name === 'scheduled') {
      const scheduledHandler = fn as NonNullable<ExportedHandler<Env>['scheduled']>
      handler.scheduled = (async (
        controller: ScheduledController,
        env: Env,
        ctx: ExecutionContext
      ) => {
        const config = getConfig(env)
        if (config.apiKey) {
          if (!isHbConfigured()) {
            Honeybadger.configure(config)
          }
          Honeybadger.setContext({
            cron: controller.cron,
            scheduledTime: controller.scheduledTime,
          })
        }
        try {
          await scheduledHandler(controller, env, ctx)
        } catch (error: unknown) {
          ctx.waitUntil(reportError(error))
          throw error
        }
      })
      continue
    }

    if (name === 'queue') {
      const queueHandler = fn as NonNullable<ExportedHandler<Env>['queue']>
      handler.queue = (async (
        batch: MessageBatch,
        env: Env,
        ctx: ExecutionContext
      ) => {
        const config = getConfig(env)
        if (config.apiKey) {
          if (!isHbConfigured()) {
            Honeybadger.configure(config)
          }
          Honeybadger.setContext({
            queue: batch.queue,
            messageCount: batch.messages.length,
          })
        }
        try {
          await queueHandler(batch, env, ctx)
        } catch (error: unknown) {
          ctx.waitUntil(reportError(error))
          throw error
        }
      })
      continue
    }

    if (name === 'email') {
      const emailHandler = fn as NonNullable<ExportedHandler<Env>['email']>
      handler.email = (async (
        message: ForwardableEmailMessage,
        env: Env,
        ctx: ExecutionContext
      ) => {
        const config = getConfig(env)
        if (config.apiKey && !isHbConfigured()) {
          Honeybadger.configure(config)
        }
        try {
          await emailHandler(message, env, ctx)
        } catch (error: unknown) {
          ctx.waitUntil(reportError(error))
          throw error
        }
      })
      continue
    }

    if (name === 'tail') {
      const tailHandler = fn as NonNullable<ExportedHandler<Env>['tail']>
      handler.tail = (async (
        events: TraceItem[],
        env: Env,
        ctx: ExecutionContext
      ) => {
        const config = getConfig(env)
        if (config.apiKey && !isHbConfigured()) {
          Honeybadger.configure(config)
        }
        try {
          await tailHandler(events, env, ctx)
        } catch (error: unknown) {
          ctx.waitUntil(reportError(error))
          throw error
        }
      })
    }
  }

  return handler
}

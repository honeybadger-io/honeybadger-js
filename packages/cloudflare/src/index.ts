import Honeybadger from '@honeybadger-io/js'
import type { Types } from '@honeybadger-io/core'

const HANDLER_NAMES = ['fetch', 'scheduled', 'queue', 'email', 'tail'] as const

function reportError(error: unknown): Promise<void> {
  if (Honeybadger.config.apiKey === undefined || Honeybadger.config.apiKey.length === 0) {
    return Promise.resolve()
  }
  const noticeable = error instanceof Error ? error : new Error(String(error))
  return Honeybadger.notifyAsync(noticeable)
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
        if (config.apiKey && (Honeybadger.config.apiKey === undefined || Honeybadger.config.apiKey.length === 0)) {
          Honeybadger.configure(config)
          Honeybadger.setContext({ url: request.url, method: request.method })
        }
        try {
          return await fetchHandler(request, env, ctx)
        } catch (error: unknown) {
          ctx.waitUntil(reportError(error))
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
        if (config.apiKey && (Honeybadger.config.apiKey === undefined || Honeybadger.config.apiKey.length === 0)) {
          Honeybadger.configure(config)
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
        if (config.apiKey && (Honeybadger.config.apiKey === undefined || Honeybadger.config.apiKey.length === 0)) {
          Honeybadger.configure(config)
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
        if (config.apiKey && (Honeybadger.config.apiKey === undefined || Honeybadger.config.apiKey.length === 0)) {
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
        if (config.apiKey && (Honeybadger.config.apiKey === undefined || Honeybadger.config.apiKey.length === 0)) {
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

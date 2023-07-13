import os from 'os'
import domain from 'domain'
import { Client, Util, Types } from '@honeybadger-io/core'
import {
  fatallyLogAndExit,
  getSourceFile
} from './server/util'
import uncaughtException from './server/integrations/uncaught_exception'
import unhandledRejection from './server/integrations/unhandled_rejection'
import { errorHandler, requestHandler } from './server/middleware'
import { lambdaHandler } from './server/aws_lambda'
import { ServerTransport } from './server/transport'
import { StackedStore } from './server/stacked_store'

const { endpoint } = Util

class Honeybadger extends Client {
  /** @internal */
  protected __beforeNotifyHandlers: Types.BeforeNotifyHandler[] = [
    (notice?: Types.Notice) => {
      if (notice && notice.backtrace) {
        notice.backtrace.forEach((line) => {
          if (line.file) {
            line.file = line.file.replace(/.*\/node_modules\/(.+)/, '[NODE_MODULES]/$1')
            line.file = line.file.replace(notice.projectRoot, '[PROJECT_ROOT]')
          }
          return line
        })
      }
    }
  ]

  public errorHandler: typeof errorHandler
  public requestHandler: typeof requestHandler
  public lambdaHandler: typeof lambdaHandler

  config: Types.Config | Types.ServerlessConfig

  constructor(opts: Partial<Types.Config | Types.ServerlessConfig> = {}) {
    super({
      afterUncaught: fatallyLogAndExit,
      projectRoot: process.cwd(),
      hostname: os.hostname(),
      ...opts,
    }, new ServerTransport())

    // serverless defaults
    const config = this.config as Types.ServerlessConfig
    config.reportTimeoutWarning = config.reportTimeoutWarning ?? true
    config.timeoutWarningThresholdMs = config.timeoutWarningThresholdMs || 50

    this.__getSourceFileHandler = getSourceFile.bind(this)
    this.errorHandler = errorHandler.bind(this)
    this.requestHandler = requestHandler.bind(this)
    this.lambdaHandler = lambdaHandler.bind(this)
  }

  factory(opts?: Partial<Types.Config | Types.ServerlessConfig>): this {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clone = new Honeybadger(opts) as any
    clone.setNotifier(this.getNotifier())

    return clone
  }

  configure(opts: Partial<Types.Config | Types.ServerlessConfig> = {}): this {
    return super.configure(opts)
  }

  protected __initStore() {
    // @ts-ignore
    this.__store = new StackedStore(this.config.maxBreadcrumbs);
  }

  public showUserFeedbackForm(): Promise<void> {
    throw new Error('Honeybadger.showUserFeedbackForm() is not supported on the server-side')
  }

  checkIn(id: string): Promise<void> {
    return this.__transport
      .send({
        method: 'GET',
        endpoint: endpoint(this.config.endpoint, `v1/check_in/${id}`),
        logger: this.logger,
      })
      .then(() => {
        this.logger.info('CheckIn sent')
        return Promise.resolve()
      })
      .catch(err => {
        this.logger.error('CheckIn failed: an unknown error occurred.', `message=${err.message}`)
      })
  }

  // This method is intended for web frameworks.
  // It allows us to track context for individual requests without leaking to other requests
  // by doing two things:
  // 1. Using AsyncLocalStorage so the context is tracked across async operations.
  // 2. Attaching the store contents to the request object,
  //   so, even if the store is destroyed, we can still recover the context for a given request
  //   (for example, in an error-handling middleware)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public withRequest<R>(
    request: Record<symbol, unknown>,
    handler: (...args: never[]) => R,
    onError?: (...args: unknown[]) => unknown
  ): R|void {
    if (onError) {
      // ALS is fine for context-tracking, but `domain` allows us to catch errors
      // thrown asynchronously (timers, event emitters)
      // We can't use unhandledRejection/uncaughtException listeners; they're global and shared across all requests
      // But the `onError` handler might be request-specific.
      // Note that this doesn't still handle all cases. `domain` has its own problems:
      // See https://github.com/honeybadger-io/honeybadger-js/pull/711
      const dom = domain.create();
      const onErrorWithContext = (err) => this.__store.run(() => onError(err), request);
      dom.on('error', onErrorWithContext);
      handler = dom.bind(handler);
    }

    return this.__store.run(handler, request);
  }

  public run<R>(callback: (...args: never[]) => R): R {
    return this.__store.run(callback);
  }
}

const singleton = new Honeybadger({
  __plugins: [
    uncaughtException(),
    unhandledRejection()
  ],
})

const NOTIFIER = {
  name: '@honeybadger-io/js',
  url: 'https://github.com/honeybadger-io/honeybadger-js/tree/master/packages/js',
  version: '__VERSION__'
}

singleton.setNotifier(NOTIFIER)

export { Types } from '@honeybadger-io/core'

export default singleton

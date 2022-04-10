import os from 'os'
import domain from 'domain'

import Client from './core/client'
import { Config, Notice, BeforeNotifyHandler, DefaultStoreContents } from './core/types'
import {
  fatallyLogAndExit,
  getSourceFile
} from './server/util'
import uncaughtException from './server/integrations/uncaught_exception'
import unhandledRejection from './server/integrations/unhandled_rejection'
import { errorHandler, requestHandler } from './server/middleware'
import { lambdaHandler } from './server/aws_lambda'
import { AsyncStore } from './server/async_store'
import { ServerTransport } from "./server/transport";

const kHoneybadgerStore = Symbol.for("kHoneybadgerStore");
class Honeybadger extends Client {
  /** @internal */
  protected __beforeNotifyHandlers: BeforeNotifyHandler[] = [
    (notice: Notice) => {
      notice.backtrace.forEach((line) => {
        if (line.file) {
          line.file = line.file.replace(/.*\/node_modules\/(.+)/, '[NODE_MODULES]/$1')
          line.file = line.file.replace(notice.projectRoot, '[PROJECT_ROOT]')
        }
        return line
      })
    }
  ]

  public errorHandler: typeof errorHandler;
  public requestHandler: typeof requestHandler;
  public lambdaHandler: typeof lambdaHandler;

  constructor(opts: Partial<Config> = {}) {
    super({
      afterUncaught: fatallyLogAndExit,
      projectRoot: process.cwd(),
      hostname: os.hostname(),
      ...opts,
    }, new ServerTransport())
    this.__getSourceFileHandler = getSourceFile.bind(this)
    this.errorHandler = errorHandler.bind(this)
    this.requestHandler = requestHandler.bind(this)
    this.lambdaHandler = lambdaHandler.bind(this)
  }

  factory(opts?: Partial<Config>): Honeybadger {
    return new Honeybadger(opts)
  }

  // This method is intended for web frameworks.
  // It allows us to track context for individual requests without leaking to other requests
  // by doing two things:
  // 1. Using AsyncLocalStorage so the context is tracked across async operations.
  // 2. Attaching the store contents to the request object,
  //   so, even if the store is destroyed, we can still recover the context for a given request
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public withRequest<R>(
      request: Record<symbol, unknown>,
      handler: (...args: never[]) => R,
      onError?: (...args: unknown[]) => unknown
  ): R|void {
    const storeObject = (request[kHoneybadgerStore] || this.__getStoreContentsOrDefault()) as DefaultStoreContents;
    this.__setStore(AsyncStore);
    if (!request[kHoneybadgerStore]) {
      request[kHoneybadgerStore] = storeObject;
    }

    if (onError) {
      // ALS is fine for context-tracking, but `domain` allows us to catch errors
      // thrown asynchronously (timers, event emitters)
      // We can't use unhandledRejection/uncaughtException listeners; they're global and shared across all requests
      // But the `onError` handler might be request-specific.
      // Note that this doesn't still handle all cases. `domain` has its own problems:
      // See https://github.com/honeybadger-io/honeybadger-js/pull/711
      const dom = domain.create();
      const onErrorWithContext = (err) => this.__store.run(storeObject, () => onError(err));
      dom.on('error', onErrorWithContext);
      handler = dom.bind(handler);
    }

    return this.__store.run(storeObject, handler);
  }
}

export default new Honeybadger({
  __plugins: [
    uncaughtException(),
    unhandledRejection()
  ],
})

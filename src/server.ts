import https from 'https'
import http from 'http'
import { URL } from 'url'
import os from 'os'
import domain from 'domain'

import Client from './core/client'
import { Config, Notice, BeforeNotifyHandler } from './core/types'
import { merge, sanitize, runAfterNotifyHandlers, endpoint } from './core/util'
import {
  fatallyLogAndExit,
  getStats,
  getSourceFile
} from './server/util'
import uncaughtException from './server/integrations/uncaught_exception'
import unhandledRejection from './server/integrations/unhandled_rejection'
import { errorHandler, requestHandler } from './server/middleware'
import { lambdaHandler } from './server/aws_lambda'
import { AsyncStore } from './server/async_store'

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
    })
    this.__getSourceFileHandler = getSourceFile.bind(this)
    this.errorHandler = errorHandler.bind(this)
    this.requestHandler = requestHandler.bind(this)
    this.lambdaHandler = lambdaHandler.bind(this)
  }

  factory(opts?: Partial<Config>): Honeybadger {
    return new Honeybadger(opts)
  }

  /** @internal */
  protected __send(notice): void {
    const {protocol} = new URL(this.config.endpoint)
    const transport = (protocol === "http:" ? http : https)

    const payload = this.__buildPayload(notice)
    payload.server.pid = process.pid

    getStats((stats: Record<string, unknown>) => {
      payload.server.stats = stats

      const data = Buffer.from(JSON.stringify(sanitize(payload, this.config.maxObjectDepth)), 'utf8')
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
          'X-API-Key': this.config.apiKey
        }
      }

      const req = transport.request(endpoint(this.config, '/v1/notices/js'), options, (res) => {
        this.logger.debug(`statusCode: ${res.statusCode}`)

        let body = ''
        res.on('data', (chunk) => {
          body += chunk
        })

        res.on('end', () => {
          if (res.statusCode !== 201) {
            runAfterNotifyHandlers(notice, this.__afterNotifyHandlers, new Error(`Bad HTTP response: ${res.statusCode}`))
            this.logger.warn(`Error report failed: unknown response from server. code=${res.statusCode}`)
            return
          }
          const uuid = JSON.parse(body).id
          runAfterNotifyHandlers(merge(notice, {
            id: uuid
          }), this.__afterNotifyHandlers)
          this.logger.info(`Error report sent ⚡ https://app.honeybadger.io/notice/${uuid}`)
        })
      })

      req.on('error', (err) => {
        this.logger.error('Error report failed: an unknown error occurred.', `message=${err.message}`)
        runAfterNotifyHandlers(notice, this.__afterNotifyHandlers, err)
      })

      req.write(data)
      req.end()
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public run<R>(handler: (...args: never[]) => R, onError?: (...args: any[]) => any): R|void {
    const storeObject = this.__getStoreOrDefaultObject();
    this.__setStore(AsyncStore)

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

import https from 'https'
import http from 'http'
import { URL } from 'url'
import os from 'os'

import Client from './core/client'
import { Config, Notice, BeforeNotifyHandler } from './core/types'
import { merge, sanitize, runAfterNotifyHandlers, endpoint } from './core/util'
import { fatallyLogAndExit, getStats } from './server/util'
import uncaughtException from './server/integrations/uncaught_exception'
import unhandledRejection from './server/integrations/unhandled_rejection'
import { errorHandler, requestHandler, lambdaHandler } from './server/middleware'

class Honeybadger extends Client {
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
    this.errorHandler = errorHandler.bind(this)
    this.requestHandler = requestHandler.bind(this)
    this.lambdaHandler = lambdaHandler.bind(this)
  }

  factory(opts?: Partial<Config>): Honeybadger {
    return new Honeybadger(opts)
  }

  protected __send(notice) {
    const { protocol } = new URL(this.config.endpoint)
    const transport = (protocol === "http:" ? http : https)

    const payload = this.__buildPayload(notice)
    payload.server.pid = process.pid

    const handlers = Array.prototype.slice.call(this.__afterNotifyHandlers)
    if (notice.afterNotify) { handlers.unshift(notice.afterNotify) }

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
            runAfterNotifyHandlers(notice, handlers, new Error(`Bad HTTP response: ${res.statusCode}`))
            this.logger.warn(`Error report failed: unknown response from server. code=${res.statusCode}`)
            return
          }
          const uuid = JSON.parse(body).id
          runAfterNotifyHandlers(merge(notice, {
            id: uuid
          }), handlers)
          this.logger.info('Error report sent.', `id=${uuid}`)
        })
      })

      req.on('error', (err) => {
        this.logger.error('Error report failed: an unknown error occurred.', `message=${err.message}`)
        runAfterNotifyHandlers(notice, handlers, err)
      })

      req.write(data)
      req.end()
    })

    return true
  }
}

export default new Honeybadger({
  __plugins: [
    uncaughtException(),
    unhandledRejection()
  ]
})

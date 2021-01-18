import https from 'https'
import http from 'http'
import { URL } from 'url'
import os from 'os'

import Client from './core/client'
import { Config, Notice } from './core/types'
import { merge, sanitize, runAfterNotifyHandlers, endpoint } from './core/util'
import { fatallyLogAndExit } from './server/util'
import uncaughtException from './server/integrations/uncaught_exception'
import unhandledRejection from './server/integrations/unhandled_rejection'
import { errorHandler, requestHandler, lambdaHandler } from './server/middleware'

class Honeybadger extends Client {
  protected __beforeNotifyHandlers = [
    (notice: Notice) => {
      notice.backtrace.forEach((line) => {
        if (line.file) {
          if (line.file?.match(notice.projectRoot)) {
            line.context = 'app'
          } else if (/node_modules/.test(line.file)) {
            line.context = 'dependency'
          } else {
            line.context = 'all'
          }
        }
        return line
      })
    }
  ]

  constructor(opts: Partial<Config> = {}) {
    super({
      afterUncaught: fatallyLogAndExit,
      projectRoot: process.cwd(),
      hostname: os.hostname(),
      ...opts,
    })
  }

  errorHandler = errorHandler.bind(this)
  requestHandler = requestHandler.bind(this)
  lambdaHandler = lambdaHandler.bind(this)

  factory(opts?: Partial<Config>): Honeybadger {
    return new Honeybadger(opts)
  }

  protected __send(notice: Notice): boolean {
    const { protocol } = new URL(this.config.endpoint)
    const transport = (protocol === "http:" ? http : https)
    const data = JSON.stringify(sanitize(this.__buildPayload(notice), this.config.maxObjectDepth))
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'X-API-Key': this.config.apiKey
      }
    }

    const handlers = Array.prototype.slice.call(this.__afterNotifyHandlers)
    if (notice.afterNotify) { handlers.unshift(notice.afterNotify) }

    const req = transport.request(endpoint(this.config, '/v1/notices'), options, (res) => {
      this.logger.debug(`statusCode: ${res.statusCode}`)

      let body = ''
      res.on('data', (chunk) => {
        body += chunk
      })

      res.on('end', () => {
        if (res.statusCode !== 201) {
          runAfterNotifyHandlers(notice, handlers, new Error(`Bad HTTP response: ${res.statusCode}`))
          this.logger.debug(`Unable to send error report: ${res.statusCode}`, res, notice)
          return
        }
        runAfterNotifyHandlers(merge(notice, {
          id: JSON.parse(body).id
        }), handlers)
        this.logger.debug('Error report sent', notice)
      })
    })

    req.on('error', (err) => {
      this.logger.error('Error: ' + err.message)
      runAfterNotifyHandlers(notice, handlers, err)
    })

    req.write(data)
    req.end()

    return true
  }
}

export default new Honeybadger({
  __plugins: [
    uncaughtException(),
    unhandledRejection()
  ]
})

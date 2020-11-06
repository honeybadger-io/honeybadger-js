import https from 'https'

import Client from './core/client'
import { Config, Notice } from './core/types'
import { merge, sanitize, runAfterNotifyHandlers } from './core/util'

class Honeybadger extends Client {
  factory(opts?: Partial<Config>): Honeybadger {
    return new Honeybadger(opts)
  }

  protected __send(notice: Notice): boolean {
    const data = JSON.stringify(sanitize(this.__buildPayload(notice), this.config.maxObjectDepth))
    const options = {
      hostname: 'api.honeybadger.io',
      port: 443,
      path: '/v1/notices',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'X-API-Key': this.config.apiKey
      }
    }

    const handlers = Array.prototype.slice.call(this.__afterNotifyHandlers)
    if (notice.afterNotify) { handlers.unshift(notice.afterNotify) }

    const req = https.request(options, (res) => {
      this.config.logger.debug(`statusCode: ${res.statusCode}`)

      let body = ''
      res.on('data', (chunk) => {
        body += chunk
      })

      res.on('end', () => {
        if (res.statusCode !== 201) {
          runAfterNotifyHandlers(notice, handlers, new Error(`Bad HTTP response: ${res.statusCode}`))
          this.config.logger.debug(`Unable to send error report: ${res.statusCode}`, res, notice)
          return
        }
        runAfterNotifyHandlers(merge(notice, {
          id: JSON.parse(body).id
        }), handlers)
        this.config.logger.debug('Error report sent', notice)
      })
    })

    req.on('error', (err) => {
      this.config.logger.error('Error: ' + err.message)
      runAfterNotifyHandlers(notice, handlers, err)
    })

    req.write(data)
    req.end()

    return true
  }
}

export default new Honeybadger({})

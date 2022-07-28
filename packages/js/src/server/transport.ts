import { Types, Util } from '@hb-test/core'
import { URL } from 'url';
import http from 'http';
import https from 'https';
import { getStats } from './util';

const { sanitize } = Util

// eslint-disable-next-line import/namespace
export class ServerTransport implements Types.Transport {
  send(options: Types.TransportOptions, payload?: Types.NoticeTransportPayload | undefined): Promise<{ statusCode: number; body: string; }> {
    const { protocol } = new URL(options.endpoint)
    const transport = (protocol === 'http:' ? http : https)

    return new Promise((resolve, reject) => {
      let promise: Promise<void>;

      // this should not be here. it should be done before reaching the transport layer
      // it could be inside a beforeNotifyHandler, but is not possible at the moment because those handlers are synchronous
      if (this.isNoticePayload(payload)) {
        promise = this.appendMetadata(payload)
      }
      else {
        promise = Promise.resolve()
      }

      promise.then(() => {
        const httpOptions = {
          method: options.method,
          headers: options.headers,
        }

        let data: Buffer | undefined = undefined
        if (payload) {
          data = Buffer.from(JSON.stringify(sanitize(payload, options.maxObjectDepth)), 'utf8')
          httpOptions.headers['Content-Length'] = data.length
        }

        const req = transport.request(options.endpoint, httpOptions, (res) => {
          options.logger.debug(`statusCode: ${res.statusCode}`)

          let body = ''
          res.on('data', (chunk) => {
            body += chunk
          })

          res.on('end', () => resolve({ statusCode: res.statusCode, body }))
        })

        req.on('error', (err) => reject(err))

        if (data) {
          req.write(data)
        }
        req.end()
      })
    })
  }

  private isNoticePayload(payload?: Types.NoticeTransportPayload | undefined): payload is Types.NoticeTransportPayload {
    return payload && (payload as Types.NoticeTransportPayload).error !== undefined
  }

  private appendMetadata(payload: Types.NoticeTransportPayload): Promise<void> {
    payload.server.pid = process.pid
    return getStats()
      .then(stats => {
        payload.server.stats = stats
      })
  }
}

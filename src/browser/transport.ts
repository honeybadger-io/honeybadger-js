import { Transport, TransportOptions, NoticeTransportPayload } from "../core/types";
import { sanitize } from "../core/util";

export class BrowserTransport implements Transport {
  send(options: TransportOptions, payload?: NoticeTransportPayload | undefined): Promise<{ statusCode: number; body: string; }> {
    return new Promise((resolve, reject) => {
      try {
        const x = new XMLHttpRequest()
        x.open(options.method, options.endpoint, options.async)

        if (Object.keys(options.headers || []).length) {
          for (const i in options.headers) {
            if (typeof options.headers[i] !== 'undefined') {
              x.setRequestHeader(i, String(options.headers[i]))
            }
          }
        }

        x.send(payload ? JSON.stringify(sanitize(payload, options.maxObjectDepth)) : undefined)
        x.onload = () => resolve({ statusCode: x.status, body: x.response })
      } catch (err) {
        reject(err)
      }
    })
  }
}

import { Types, Util } from '@honeybadger-io/core'
import { globalThisOrWindow } from './util'

const { sanitize } = Util

/**
 * Helper function to get typesafe Object.entries()
 * https://twitter.com/mattpocockuk/status/1502264005251018754?lang=en
 */
function objectEntries<T, U extends keyof T> (obj: T): Array<[U, T[U]]> {
  return Object.entries(obj) as Array<[U, T[U]]>
}

export class BrowserTransport implements Types.Transport {
  async send (options: Types.TransportOptions, payload?: Types.NoticeTransportPayload | undefined): Promise<{ statusCode: number, body: string }> {
    const headerArray = options.headers ? objectEntries(options.headers) : []

    const headers: HeadersInit = {}

    headerArray.forEach(([key, value]) => {
      if (key != null && value != null) {
        headers[String(key)] = String(value)
      }
    })

    const requestInit: RequestInit = {
      method: options.method,
      headers
    }

    // GET methods cannot have a body.
    if (options.method === 'POST') {
      requestInit.body = payload ? JSON.stringify(sanitize(payload, options.maxObjectDepth)) : undefined
    }

    const response = await globalThisOrWindow().fetch(options.endpoint, requestInit)

    const body = await response.text()

    return Promise.resolve({ statusCode: response.status, body })
  }
}

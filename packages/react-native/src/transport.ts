import { Types, Util } from '@honeybadger-io/core'
import { Platform } from 'react-native'
import * as pkg from '../package.json'
import fetch from 'jest-fetch-mock';

export class Transport implements Types.Transport {
  defaultHeaders(): Record<string, string> {
    return {};
  }

  async send<T>(
    options: Types.TransportOptions,
    payload?: T
  ): Promise<{ statusCode: number; body: string; }> {

    const params: RequestInit = {
      method: options.method,
      headers: {
        ...options.headers,
        'User-Agent': this.buildUserAgent()
      },
    }

    // GET methods cannot have a body.
    if (options.method === 'POST') {
      params.body = this.buildJsonBody(options, payload)
    }

    // react-native provides a fetch API
    const res = await fetch(options.endpoint, params)
    const resBody = await res.text()

    return {
      statusCode: res.status,
      body: resBody
    }
  }

  private buildUserAgent() {
    const rnVersion = Platform.constants?.reactNativeVersion
    const rnVersionStr = rnVersion
      ? `${rnVersion?.major}.${rnVersion?.minor}.${rnVersion?.patch}`
      : 'n/a'

    let nativePlatform: string
    if (Platform.OS === 'ios') {
      const nativePlatformName = Platform.constants.systemName || 'iOS'
      nativePlatform = `${nativePlatformName} ${Platform.constants.osVersion}`
    } else {
      nativePlatform = 'Android'
    }

    return `${pkg.name} ${pkg.version}; ${rnVersionStr}; ${nativePlatform}`;
  }

  private buildJsonBody<T>(
    options: Types.TransportOptions,
    payload: T
  ): string {
    const body = Util.sanitize(payload, options.maxObjectDepth)
    return JSON.stringify(body)
  }
}

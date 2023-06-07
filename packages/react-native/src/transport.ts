import { Types, Util } from '@honeybadger-io/core'
import { Platform } from 'react-native'
import * as pkg from '../package.json'

export class Transport implements Types.Transport {
  
  async send(
    options: Types.TransportOptions, 
    payload?: Types.NoticeTransportPayload
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
    const reactNativeVersion = `${Platform.constants.reactNativeVersion.major}.${Platform.constants.reactNativeVersion.minor}.${Platform.constants.reactNativeVersion.patch}`
    
    let nativePlatform:string
    if (Platform.OS === 'ios') {
      const nativePlatformName = Platform.constants.systemName || 'iOS'
      nativePlatform = `${nativePlatformName} ${Platform.constants.osVersion}`
    } else {
      nativePlatform = 'Android'
    }

    return `${pkg.name} ${pkg.version}; ${reactNativeVersion}; ${nativePlatform}`;
  }

  private buildJsonBody(
    options: Types.TransportOptions, 
    payload: Types.NoticeTransportPayload
  ): string {
    const body = Util.sanitize({
      ...payload, 
      notifier: {
        name: pkg.name, 
        url: pkg.repository.url, 
        version: pkg.version,
      }
    }, options.maxObjectDepth)
    return JSON.stringify(body)
  }
}

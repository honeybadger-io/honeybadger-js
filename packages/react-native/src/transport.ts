import { Types, Util } from '@honeybadger-io/core'
import { Platform  } from 'react-native';
import * as pkg from '../package.json'

export class Transport implements Types.Transport {
  
  async send(
      options: Types.TransportOptions, 
      payload: Types.NoticeTransportPayload
    ): Promise<{ statusCode: number; body: string; }> {
    
    payload.notifier = {
      name: pkg.name, 
      url: pkg.repository.url, 
      version: pkg.version,
    }

    options.logger.debug(`\n\nPAYLOAD NOTIFIER`, payload.notifier)

    const params = {
      method: options.method,
      headers: {
        ...options.headers, 
        'User-Agent': this.buildUserAgent()
      },
      // TODO: is this sanitize helpful?
      body: JSON.stringify(Util.sanitize(payload, options.maxObjectDepth))
    };

    
    options.logger.debug(`\n\n HEADERS`, params.headers)

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
}

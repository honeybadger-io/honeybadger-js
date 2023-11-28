/* eslint-disable prefer-rest-params */
import { Types, Util } from '@honeybadger-io/core'
import Client from '../../browser'
import { globalThisOrWindow } from '../util';

const { instrumentConsole } = Util

export default function (_window = globalThisOrWindow()): Types.Plugin {
  return {
    load: (client: typeof Client) => {
      function sendEventsToInsights() {
        return client.config.eventsEnabled
      }

      if (!sendEventsToInsights()) {
        return
      }

      instrumentConsole(_window, (level, args) => {
        // todo: send browser info
        client.logEvent({
          level,
          args
        })
      })
    }
  }
}

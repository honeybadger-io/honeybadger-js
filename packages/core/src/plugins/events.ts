/* eslint-disable prefer-rest-params */
import { Client } from '../client'
import { globalThisOrWindow, instrumentConsole } from '../util';
import { EventPayload, Plugin } from '../types'

export default function (_window = globalThisOrWindow()): Plugin {
  return {
    shouldReloadOnConfigure: false,
    load: (client: Client) => {
      function sendEventsToInsights() {
        return client.config.eventsEnabled
      }

      if (!sendEventsToInsights()) {
        return
      }

      instrumentConsole(_window, (level, args) => {
        if (!sendEventsToInsights()) {
          return
        }

        if (args.length === 0) {
          return
        }

        const data: Record<string, unknown> = {
          severity: level,
        }

        if (typeof args[0] === 'string') {
          data.message = args[0]
          data.args = args.slice(1)
        }
        else {
          data.args = args
        }

        client.event('log', data)
      })
    }
  }
}

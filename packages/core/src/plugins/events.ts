/* eslint-disable prefer-rest-params */
import { Client } from '../client'
import { globalThisOrWindow, instrumentConsole } from '../util';
import { Plugin } from '../types'

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

        client.event('log', {
          severity: level,
          message: args[0],
          args: args.slice(1)
        })
      })
    }
  }
}

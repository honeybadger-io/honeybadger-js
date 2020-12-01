import { Plugin } from '../../core/types'
import { fatallyLogAndExit } from '../../server/util'
import Client from '../../server'

let count = 0

export default function (): Plugin {
  return {
    load: (client: typeof Client) => {
      if (!client.config.enableUncaught) { return }

      process.on('uncaughtException', function (uncaughtError) {
        // Prevent recursive errors
        if (count > 1) { fatallyLogAndExit(uncaughtError) }

        if (client.config.enableUncaught) {
          client.notify(uncaughtError, {
            afterNotify: (_err, _notice) => {
              count += 1
              client.config.afterUncaught(uncaughtError)
            }
          })
        } else {
          count += 1
          client.config.afterUncaught(uncaughtError)
        }
      })
    }
  }
}

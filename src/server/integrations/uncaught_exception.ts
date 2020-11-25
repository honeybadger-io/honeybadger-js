import { Plugin } from '../../core/types'
import Client from '../../server'

export default function (): Plugin {
  return {
    load: (client: typeof Client) => {
      if (!client.config.onerror) { return }

      process.on('uncaughtException', function (uncaughtError) {
        if (client.config.onerror) {
          client.notify(uncaughtError, {
            afterNotify: (_err, _notice) => {
              client.config.afterUncaughtException(uncaughtError)
            }
          })
        } else {
          client.config.afterUncaughtException(uncaughtError)
        }
      })
    }
  }
}

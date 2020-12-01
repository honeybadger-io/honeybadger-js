import { Plugin } from '../../core/types'
import { fatallyLogAndExit } from '../../server/util'
import Client from '../../server'

export default function (): Plugin {
  return {
    load: (client: typeof Client) => {
      if (!client.config.enableUnhandledRejection) { return }

      process.on('unhandledRejection', function (reason, _promise) {
        if (!client.config.enableUnhandledRejection) { return }
        client.notify(reason, {component: 'unhandledRejection'})
      })
    }
  }
}

import { Types } from '@honeybadger-io/core'
import Client from '../../server'
import { fatallyLogAndExit } from '../util'

export default function (): Types.Plugin {
  return {
    load: (client: typeof Client) => {
      if (!client.config.enableUnhandledRejection) {
        return
      }

      process.on('unhandledRejection', function (reason, _promise) {
        if (!client.config.enableUnhandledRejection) {
          fatallyLogAndExit(reason as Error)
          return
        }

        client.notify(reason as Types.Noticeable, { component: 'unhandledRejection' }, {
          afterNotify: () => {
            fatallyLogAndExit(reason as Error)
          }
        })
      })
    }
  }
}

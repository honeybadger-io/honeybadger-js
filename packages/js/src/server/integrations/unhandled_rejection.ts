import { Types } from '@honeybadger-io/core'
import Client from '../../server'
import { fatallyLogAndExit } from '../util'

/**
 * If there are no other unhandledRejection listeners,
 * we want to report the exception to Honeybadger and
 * mimic the default behavior of NodeJs,
 * which is to exit the process with code 1
 */
function hasUnhandledRejectionListeners() {
  return process.listeners('unhandledRejection').length !== 0
}

export default function (): Types.Plugin {
  return {
    load: (client: typeof Client) => {
      if (!client.config.enableUnhandledRejection) {
        return
      }

      const hasOtherListeners = hasUnhandledRejectionListeners();
      process.on('unhandledRejection', function honeybadgerUnhandledRejectionListener(reason, _promise) {
        if (!client.config.enableUnhandledRejection) {
          if (!hasOtherListeners) {
            fatallyLogAndExit(reason as Error)
          }
          return
        }

        client.notify(reason as Types.Noticeable, { component: 'unhandledRejection' }, {
          afterNotify: () => {
            if (!hasOtherListeners) {
              fatallyLogAndExit(reason as Error)
            }
          }
        })
      })
    }
  }
}

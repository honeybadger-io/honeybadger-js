import { Types } from '@honeybadger-io/core'
import Client from '../../server'
import UnhandledRejectionMonitor from './unhandled_rejection_monitor'

export default function (): Types.Plugin {
  return {
    load: (client: typeof Client) => {
      if (!client.config.enableUnhandledRejection) {
        return
      }
      const unhandledRejectionMonitor = new UnhandledRejectionMonitor(client)
      process.on('unhandledRejection', function honeybadgerUnhandledRejectionListener(reason, _promise) {
        unhandledRejectionMonitor.handleUnhandledRejection(reason, _promise)
      })
    }
  }
}

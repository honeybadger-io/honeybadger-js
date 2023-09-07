import { Types } from '@honeybadger-io/core'
import Client from '../../server'
import UnhandledRejectionMonitor from './unhandled_rejection_monitor'

const unhandledRejectionMonitor = new UnhandledRejectionMonitor()

export default function (): Types.Plugin {
  return {
    load: (client: typeof Client) => {
      unhandledRejectionMonitor.setClient(client)
      if (client.config.enableUnhandledRejection) {
        unhandledRejectionMonitor.maybeAddListener()
      } else {
        unhandledRejectionMonitor.maybeRemoveListener()
      } 
    }
  }
}

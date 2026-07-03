import { Types } from '@honeybadger-io/core'
import Client from '../../server'
import ShutdownMonitor from './shutdown_monitor'

const shutdownMonitor = new ShutdownMonitor()

export default function (): Types.Plugin {
  return {
    load: (client: typeof Client) => {
      shutdownMonitor.setClient(client)
      // programmatic events can be queued at any time, so the flush listener
      // is always registered
      shutdownMonitor.maybeAddListener()
    },
    shouldReloadOnConfigure: true,
  }
}

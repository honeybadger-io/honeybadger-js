import { Types } from '@honeybadger-io/core'
import Client from '../../server'
import ShutdownMonitor from './shutdown_monitor'

const shutdownMonitor = new ShutdownMonitor()

export default function (): Types.Plugin {
  return {
    load: (client: typeof Client) => {
      shutdownMonitor.setClient(client)
      // at the moment, the shutdown monitor only sends events from the queue
      // if we implement a queue for throttling errors, we won't have to check for `config.eventsEnabled`
      if (client.config.eventsEnabled) {
        shutdownMonitor.maybeAddListener()
      } else {
        shutdownMonitor.maybeRemoveListener()
      }
    },
    shouldReloadOnConfigure: true,
  }
}

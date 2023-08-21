import { Types } from '@honeybadger-io/core'
import Client from '../../server'
import UncaughtExceptionMonitor from './uncaught_exception_monitor'

const uncaughtExceptionMonitor = new UncaughtExceptionMonitor()

export default function (): Types.Plugin {
  return {
    load: (client: typeof Client) => {
      uncaughtExceptionMonitor.setClient(client)
      if (!client.config.enableUncaught) { 
        return
      }
      uncaughtExceptionMonitor.maybeAddListener()
    }
  }
}

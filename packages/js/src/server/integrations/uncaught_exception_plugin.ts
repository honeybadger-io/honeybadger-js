import { Types } from '@honeybadger-io/core'
import Client from '../../server'
import UncaughtExceptionMonitor from './uncaught_exception_monitor'

export default function (): Types.Plugin {
  return {
    load: (client: typeof Client) => {
      if (!client.config.enableUncaught) { 
        return
      }
      const uncaughtExceptionMonitor = new UncaughtExceptionMonitor(client)
      process.on('uncaughtException', function honeybadgerUncaughtExceptionListener(uncaughtError) {
        uncaughtExceptionMonitor.handleUncaughtException(uncaughtError)
      })
    }
  }
}

import Client from '../../server'
import { fatallyLogAndExitGracefully } from '../util'

export default class ShutdownMonitor {

  // SIGTERM is raised by AWS Lambda when the function is being shut down
  // SIGINT is raised by the user pressing CTRL+C
  private static KILL_SIGNALS = ['SIGTERM', 'SIGINT'] as const

  protected __isReporting: boolean
  protected __client: typeof Client
  protected __listener: (signal: string) => void

  constructor() {
    this.__isReporting = false
    this.__listener = this.makeListener()
  }

  setClient(client: typeof Client) {
    this.__client = client
  }

  makeListener() {
    // noinspection UnnecessaryLocalVariableJS
    const honeybadgerShutdownListener = async (signal: NodeJS.Signals) => {
      if (this.__isReporting || !this.__client) {
        return
      }

      this.__isReporting = true

      await this.__client.flushAsync()

      this.__isReporting = false

      if (!this.hasOtherShutdownListeners(signal)) {
        fatallyLogAndExitGracefully(signal)
      }
    }

    return honeybadgerShutdownListener
  }

  maybeAddListener() {
    for (const signal of ShutdownMonitor.KILL_SIGNALS) {
      const signalListeners = process.listeners(signal);
      if (!signalListeners.includes(this.__listener)) {
        process.on(signal, this.__listener)
      }
    }
  }

  maybeRemoveListener() {
    for (const signal of ShutdownMonitor.KILL_SIGNALS) {
      const signalListeners = process.listeners(signal);
      if (signalListeners.includes(this.__listener)) {
        process.removeListener(signal, this.__listener)
      }
    }
  }

  hasOtherShutdownListeners(signal: NodeJS.Signals) {
    const otherListeners = process
      .listeners(signal)
      .filter(listener => listener !== this.__listener)

    return otherListeners.length > 0;

  }
}

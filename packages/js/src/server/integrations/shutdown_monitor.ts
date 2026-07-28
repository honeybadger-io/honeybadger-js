import Client from '../../server'
import { fatallyLogAndExitGracefully } from '../util'

export default class ShutdownMonitor {

  // SIGTERM is raised by AWS Lambda when the function is being shut down
  // SIGINT is raised by the user pressing CTRL+C
  private static KILL_SIGNALS = ['SIGTERM', 'SIGINT'] as const

  protected __isReporting: boolean
  protected __client: typeof Client
  protected __listener: (signal: string) => void
  protected __beforeExitListener: () => void

  constructor() {
    this.__isReporting = false
    this.__listener = this.makeListener()
    this.__beforeExitListener = this.makeBeforeExitListener()
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

  // `beforeExit` fires when the event loop drains and the process is about to
  // exit on its own — a natural exit, which the SIGTERM/SIGINT listeners above do
  // *not* cover. We flush any queued events (e.g. batched Insights events whose
  // cooldown timer is unref'd and therefore won't hold the process open) so they
  // aren't dropped on the way out. Unlike the signal path we don't force-exit;
  // flushing schedules real I/O, which keeps the process alive until delivery, and
  // then Node exits naturally. The `__isReporting` guard stops the flush's own I/O
  // from re-triggering us.
  makeBeforeExitListener() {
    // noinspection UnnecessaryLocalVariableJS
    const honeybadgerBeforeExitListener = async () => {
      if (this.__isReporting || !this.__client) {
        return
      }

      this.__isReporting = true

      await this.__client.flushAsync()

      this.__isReporting = false
    }

    return honeybadgerBeforeExitListener
  }

  maybeAddListener() {
    for (const signal of ShutdownMonitor.KILL_SIGNALS) {
      const signalListeners = process.listeners(signal) || [];
      if (!signalListeners.includes(this.__listener)) {
        process.on(signal, this.__listener)
      }
    }

    const beforeExitListeners = process.listeners('beforeExit') || [];
    if (!beforeExitListeners.includes(this.__beforeExitListener)) {
      process.on('beforeExit', this.__beforeExitListener)
    }
  }

  maybeRemoveListener() {
    for (const signal of ShutdownMonitor.KILL_SIGNALS) {
      const signalListeners = process.listeners(signal) || [];
      if (signalListeners.includes(this.__listener)) {
        process.removeListener(signal, this.__listener)
      }
    }

    const beforeExitListeners = process.listeners('beforeExit') || [];
    if (beforeExitListeners.includes(this.__beforeExitListener)) {
      process.removeListener('beforeExit', this.__beforeExitListener)
    }
  }

  hasOtherShutdownListeners(signal: NodeJS.Signals) {
    const otherListeners = (process.listeners(signal) || [])
      .filter(listener => listener !== this.__listener)

    return otherListeners.length > 0;

  }
}

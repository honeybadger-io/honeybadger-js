import Client from '../../server'
import { fatallyLogAndExit } from '../util'
import { Types } from '@honeybadger-io/core'

export default class UnhandledRejectionMonitor {
  protected __isReporting: boolean
  protected __client: typeof Client
  protected __listener: (reason: unknown, _promise: Promise<unknown>) => void

  constructor() {
    this.__isReporting = false
    this.__listener = this.makeListener()
  }

  setClient(client: typeof Client) {
    this.__client = client
  }

  makeListener() {
    const honeybadgerUnhandledRejectionListener = (reason: unknown, _promise: Promise<unknown>) => {
      this.__isReporting = true;
      this.__client.notify(reason as Types.Noticeable, { component: 'unhandledRejection' }, {
        afterNotify: () => {
          this.__isReporting = false;
          if (!this.hasOtherUnhandledRejectionListeners()) {
            fatallyLogAndExit(reason as Error)
          }
        }
      })
    }
    return honeybadgerUnhandledRejectionListener
  }

  maybeAddListener() {
    const listeners = process.listeners('unhandledRejection')
    if (!listeners.includes(this.__listener)) {
      process.on('unhandledRejection', this.__listener)
    }
  }

  maybeRemoveListener() {
    const listeners = process.listeners('unhandledRejection')
    if (listeners.includes(this.__listener)) {
      process.removeListener('unhandledRejection', this.__listener)
    }
  }

  /**
   * If there are no other unhandledRejection listeners,
   * we want to report the exception to Honeybadger and
   * mimic the default behavior of NodeJs,
   * which is to exit the process with code 1
   */
  hasOtherUnhandledRejectionListeners() {
    const otherListeners = process.listeners('unhandledRejection')
      .filter(listener => listener !== this.__listener)
    return otherListeners.length > 0
  }
}

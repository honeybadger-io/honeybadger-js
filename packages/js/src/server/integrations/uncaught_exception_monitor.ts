import Client from '../../server'
import { removeAwsDefaultUncaughtExceptionListener } from '../aws_lambda'
import { fatallyLogAndExit } from '../util'

export default class UncaughtExceptionMonitor {
  protected __isReporting: boolean
  protected __handlerAlreadyCalled: boolean
  protected __client: typeof Client
  protected __listener: (error: Error) => void

  constructor() {
    this.__isReporting = false
    this.__handlerAlreadyCalled = false
    this.__listener = this.makeListener()
    this.removeAwsLambdaListener()
  }

  setClient(client: typeof Client) {
    this.__client = client
  }

  makeListener() {
    // noinspection UnnecessaryLocalVariableJS
    const honeybadgerUncaughtExceptionListener = (uncaughtError: Error) => {
      if (this.__isReporting || !this.__client) { return }

      // report only the first error - prevent reporting recursive errors
      if (this.__handlerAlreadyCalled) {
        if (!this.hasOtherUncaughtExceptionListeners()) {
          fatallyLogAndExit(uncaughtError, 'uncaught exception')
        }
        return
      }

      this.__isReporting = true
      this.__client.notify(uncaughtError, {
        afterNotify: (_err, _notice) => {
          this.__isReporting = false
          this.__handlerAlreadyCalled = true
          this.__client.config.afterUncaught(uncaughtError)
          if (!this.hasOtherUncaughtExceptionListeners()) {
            fatallyLogAndExit(uncaughtError, 'uncaught exception')
          }
        }
      })
    }
    return honeybadgerUncaughtExceptionListener
  }

  maybeAddListener() {
    const listeners = process.listeners('uncaughtException')
    if (!listeners.includes(this.__listener)) {
      process.on('uncaughtException', this.__listener)
    }
  }

  maybeRemoveListener() {
    const listeners = process.listeners('uncaughtException')
    if (listeners.includes(this.__listener)) {
      process.removeListener('uncaughtException', this.__listener)
    }
  }

  removeAwsLambdaListener() {
    const isLambda = !!process.env.LAMBDA_TASK_ROOT
    if (!isLambda) { return }
    removeAwsDefaultUncaughtExceptionListener()
  }

  /**
   * If there are no other uncaughtException listeners,
   * we want to report the exception to Honeybadger and
   * mimic the default behavior of NodeJs,
   * which is to exit the process with code 1
   *
   * Node sets up domainUncaughtExceptionClear when we use domains.
   * Since they're not set up by a user, they shouldn't affect whether we exit or not
   */
  hasOtherUncaughtExceptionListeners(): boolean {
    const allListeners = process.listeners('uncaughtException')
    const otherListeners = allListeners.filter(listener => (
      listener.name !== 'domainUncaughtExceptionClear'
      && listener !== this.__listener
    ))
    return otherListeners.length > 0
  }
}

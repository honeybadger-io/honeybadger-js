import Client from '../../server'
import { removeAwsDefaultUncaughtExceptionListener } from '../aws_lambda'
import { fatallyLogAndExit } from '../util'

export default class UncaughtExceptionMonitor {
  protected __isReporting: boolean
  protected __handlerAlreadyCalled: boolean
  protected __client: typeof Client
  // TODO: binding this makes the name 'bound honeybadgerUncaughtExceptionlistener'
  // could instead do something like 'makeListener()'
  // the name is not critical afaik, but I'd like it to be clean
  protected __listener = function honeybadgerUncaughtExceptionListener(uncaughtError) {
    this.handleUncaughtException(uncaughtError)
  }.bind(this)

  constructor() {
    this.__isReporting = false
    this.__handlerAlreadyCalled = false 
    this.removeAwsLambdaListener()
  }

  setClient(client: typeof Client) {
    this.__client = client
  }

  maybeAddListener() {
    const listeners = process.listeners('uncaughtException')
    if (!listeners.includes(this.__listener)) {
      process.on('uncaughtException', this.__listener)
    }
  }

  maybeRemoveListener() {

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
   */
  hasOtherUncaughtExceptionListeners() {
    const allListeners = process.listeners('uncaughtException')
    // Node sets up these listeners when we use domains
    // Since they're not set up by a user, they shouldn't affect whether we exit or not
    const domainListeners = allListeners.filter(listener => {
      return listener.name === 'domainUncaughtExceptionClear' 
    })
    return allListeners.length - domainListeners.length > 1
  }

  handleUncaughtException(uncaughtError: Error) {
    if (this.__isReporting) { return }
  
    if (!this.__client.config.enableUncaught) {
      this.__client.config.afterUncaught(uncaughtError)
      if (!this.hasOtherUncaughtExceptionListeners()) {
        fatallyLogAndExit(uncaughtError)
      }
      return
    }
  
    // report only the first error - prevent reporting recursive errors
    if (this.__handlerAlreadyCalled) {
      if (!this.hasOtherUncaughtExceptionListeners()) {
        fatallyLogAndExit(uncaughtError)
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
          fatallyLogAndExit(uncaughtError)
        }
      }
    })
  }
}
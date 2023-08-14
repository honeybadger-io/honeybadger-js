import Client from '../../server'
import { removeAwsDefaultUncaughtExceptionListener } from '../aws_lambda'
import { fatallyLogAndExit } from '../util'

export default class UncaughtExceptionMonitor {
  protected __isReporting: boolean
  protected __handlerAlreadyCalled: boolean
  protected __client: typeof Client

  constructor(client: typeof Client) {
    this.__isReporting = false
    this.__handlerAlreadyCalled = false
    this.__client = client
    this.removeAwsLambdaListener()
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
    return process.listeners('uncaughtException').length > 1
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
import Client from '../../server'
import { fatallyLogAndExit } from '../util'
import { Types } from '@honeybadger-io/core'

export default class UnhandledRejectionMonitor {
  protected __isReporting: boolean
  protected __client: typeof Client

  constructor(client: typeof Client) {
    this.__isReporting = false
    this.__client = client
  }

  /**
   * If there are no other unhandledRejection listeners,
   * we want to report the exception to Honeybadger and
   * mimic the default behavior of NodeJs,
   * which is to exit the process with code 1
   */
  hasOtherUnhandledRejectionListeners() {
    return process.listeners('unhandledRejection').length > 1
  }

  handleUnhandledRejection(reason: Error | any, _promise: Promise<any>) {
    if (!this.__client.config.enableUnhandledRejection) {
      if (!this.hasOtherUnhandledRejectionListeners() && !this.__isReporting) {
        fatallyLogAndExit(reason as Error)
      }
      return
    }

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
}

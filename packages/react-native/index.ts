import { Client, Util, Types } from '@honeybadger-io/core'
import { Transport } from './transport'

class Honeybadger extends Client {
  protected __jsHandlerInitialized:boolean
  protected __originalJsHandler:Function

  constructor(opts: Partial<Types.Config> = {}) {
    super(opts, new Transport())
    
    this.__jsHandlerInitialized = false
  }

  configure(opts: Partial<Types.Config> = {}): this {
    this.setJavascriptErrorHandler()
    return super.configure(opts)
  }

  factory(opts?: Partial<Types.BrowserConfig>): this {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Honeybadger(opts) as any
  }

  checkIn(): Promise<void> {
    throw new Error('Honeybadger.checkIn() is not yet supported on react-native')
  }

  showUserFeedbackForm(): Promise<void> {
    throw new Error('Honeybadger.showUserFeedbackForm() is not yet supported on react-native')
  }

  private setJavascriptErrorHandler() {
    if (this.__jsHandlerInitialized) { return }

    this.logger.debug('Setting up the JavaScript global error handler.')
    this.__originalJsHandler = ErrorUtils.getGlobalHandler();

    ErrorUtils.setGlobalHandler((err, isFatal) => {
      this.logger.debug('JavaScript global error handler triggered.')
      // TODO: original version added some info in onJavascriptError
      // check if we are losing anything important in formatting the error
      // eg do we want the errorClass to look like "React Native iOs Error"
      // (I'd lean toward leaving it this way)
      this.notify(err)

      // Allowing the default error handler to process the error after
      // we're done with it will show the useful RN red info box in dev.
      if ( this.__originalJsHandler ) {
        this.logger.debug('Passing error to previous error handler.')
        this.__originalJsHandler(err, isFatal)
      }
    })

    this.__jsHandlerInitialized = true
  }
}

export { Types } from '@honeybadger-io/core'
export default new Honeybadger()
import { Platform, NativeModules, NativeEventEmitter } from 'react-native';
import { Client, Types } from '@honeybadger-io/core'
import { Transport } from './transport'
import { backtraceAndDetailsFromIosException, errorMessageFromIosException } from './iosUtils'
import { NativeExceptionData } from './types'

class Honeybadger extends Client {
  protected __jsHandlerInitialized:boolean
  protected __nativeHandlerInitialized:boolean
  protected __originalJsHandler:Function

  constructor(opts: Partial<Types.Config> = {}) {
    super(opts, new Transport())
    
    this.__jsHandlerInitialized = false
    this.__nativeHandlerInitialized = false
  }

  configure(opts: Partial<Types.Config> = {}): this {
    this.setJavascriptErrorHandler()
    this.setNativeExceptionHandler()
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

  private setNativeExceptionHandler() {
    if (this.__nativeHandlerInitialized) { return }

    const HoneybadgerNativeModule = NativeModules.HoneybadgerReactNative;
    if (!HoneybadgerNativeModule) {
      this.logger.error('The native module was not found. Please review the installation instructions.')
      return
    }
  
    HoneybadgerNativeModule.start()
  
    const nativeEventEmitter = new NativeEventEmitter(HoneybadgerNativeModule)
    nativeEventEmitter.addListener(
      'native-exception-event', 
      this.onNativeException.bind(this)
    )

    this.__nativeHandlerInitialized = true
  }

  private onNativeException(data:NativeExceptionData) {
    this.logger.debug(`Native exception on ${Platform.OS}:`, data)
    switch ( Platform.OS ) {
      case 'ios': 
        this.onNativeIOSException(data)
      break
      case 'android': 
        this.onNativeAndroidException(data)
      break
    }
  }

  /*******************************************************
   * iOS
   *******************************************************/
  private onNativeIOSException(data:NativeExceptionData) {
    const { backtrace, backtraceDetails } = backtraceAndDetailsFromIosException(data)
    const notice = {
      name: `React Native iOS ${data.type}`,
      message: errorMessageFromIosException(data),
      backtrace,
      details: {
        errorDomain: data.errorDomain || '',
        initialHandler: data.initialHandler || '',
        userInfo: data.userInfo || {},
        architecture: data.architecture || '',
        ...backtraceDetails
      },
    }
    this.notify(notice)
  }

  /*******************************************************
   * Android
   *******************************************************/
  private onNativeAndroidException(data:NativeExceptionData) {
    const notice = {
      name: `React Native Android ${data.type}`,
      message: data.message || '',
      details: {
        errorDomain: data.errorDomain || '',
        initialHandler: data.initialHandler || '',
        userInfo: data.userInfo || {},
        architecture: data.architecture || '',
      },
      backtrace: this.backtraceFromAndroidException(data)
    }
    this.notify(notice)
  }

  private backtraceFromAndroidException(data:NativeExceptionData) {
    if ( !data || !data.stackTrace ) return []

    function isStringWithValue(val:unknown):Boolean {
      return typeof val === 'string' && val.trim().length > 0;
    }

    return data.stackTrace.map((frame) => {
      const method = (isStringWithValue(frame.class) && isStringWithValue(frame.method)) 
        ? `${frame.class}.${frame.method}` 
        : frame.method;
      return {
        method: method || '',
        file: frame.file || '',
        number: frame.line || ''
      }
    })
  }
}

export { Types } from '@honeybadger-io/core'
export default new Honeybadger()
import { Platform, NativeModules, NativeEventEmitter } from 'react-native';
import { Client, Types } from '@honeybadger-io/core'
import { Transport } from './transport'
import { backtraceAndDetailsFromIosException, errorMessageFromIosException } from './iosUtils'
import { backtraceFromAndroidException } from './androidUtils'
import { NativeExceptionData } from './types'

class Honeybadger extends Client {
  private __jsHandlerInitialized:boolean
  private __nativeHandlerInitialized:boolean
  private __originalJsHandler:(error: Error, isFatal: boolean) => void

  constructor(opts: Partial<Types.Config> = {}) {
    super(mergeDefaultOpts(opts), new Transport())
    
    this.__jsHandlerInitialized = false
    this.__nativeHandlerInitialized = false

    this.setContext({ 
      platform: {
        os: Platform.OS, 
        version: Platform.Version
      }
    })
  }

  configure(opts: Partial<Types.Config> = {}): this {
    this.setJavascriptErrorHandler()
    this.setNativeExceptionHandler()
    return super.configure(mergeDefaultOpts(opts))
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
      this.notify(err)

      // Allowing the default error handler to process the error after
      // we're done with it will show the useful RN red info box in dev.
      // However in prod it causes duplicate errors to be reported on iOS
      // since the default handler re-throws a native error
      if (__DEV__ && this.__originalJsHandler) {
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
    switch ( Platform.OS ) {
    case 'ios': 
      this.onNativeIOSException(data)
      break
    case 'android': 
      this.onNativeAndroidException(data)
      break
    }
  }

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
      backtrace: backtraceFromAndroidException(data)
    }
    this.notify(notice)
  }
}

function mergeDefaultOpts(opts) {
  return {
    environment: __DEV__ ? 'development' : 'production', 
    ...opts
  }
}

export default new Honeybadger()
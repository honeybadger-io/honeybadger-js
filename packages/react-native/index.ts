import { Platform, NativeModules, NativeEventEmitter } from 'react-native';
import { Client, Types } from '@honeybadger-io/core'
import { Transport } from './transport'

interface NativeExceptionData {
  type: string;
  architecture?: string;
  message?: string;
  name?: string;
  reason?: string;
  userInfo?: object;
  callStackSymbols?: string[];
  initialHandler?: Function;
  reactNativeStackTrace?: string[];
  localizedDescription?: string;
  errorDomain?: string;
  stackTrace?: {
    method?: string, 
    class?: string, 
    line?: string, 
    file?: string
  }[];
}

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

  // TODO: The delayed android exception is correctly collected
  // however the immediate exception is not. This appears to be the 
  // same in the currently published package... so not an issue I
  // created here but still concerning. 
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
    const notice = {
      name: `React Native iOS ${data.type}`,
      message: this.errorMessageFromIOSException(data),
      details: {
        errorDomain: data.errorDomain || '',
        initialHandler: data.initialHandler || '',
        userInfo: data.userInfo || {},
        architecture: data.architecture || '',
      },
    }
    this.notify(notice)
  }

  private errorMessageFromIOSException(data:NativeExceptionData) {
    if ( !data ) {
      return '';
    }
  
    if (data.localizedDescription) {
      const localizedDescription = data.localizedDescription;
      const startOfNativeIOSCallStack = localizedDescription.indexOf('callstack: (\n');
      if ( startOfNativeIOSCallStack === -1 ) {
        const lines = localizedDescription.split('\n');
        return lines.length === 0 ? localizedDescription : lines[0].trim();
      } else {
        return localizedDescription.substring(0, startOfNativeIOSCallStack).trim();
      }
    } else if (data.name || data.reason) {
      return `${data.name} : ${data.reason}`.trim();
    } else {
      return ''
    }
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
      // TODO - the client is using makeNotice, which
      // makes a backtrace array from a stack string. 
      // we want to pass backtrace array directly
      backtrace: this.backTraceFromAndroidException(data)
    }
    this.notify(notice)
  }

  private backTraceFromAndroidException(data:NativeExceptionData) {
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
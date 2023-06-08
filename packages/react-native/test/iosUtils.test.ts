import { 
  errorMessageFromIosException, 
  framesFromIOSCallStack, 
} from "../src/iosUtils"

// Pulled this example data from a native error thrown in 
// examples/react-native-cli running in dev mode (npm run ios)
// Shortened the callstack for simplicity
const dataWithLocalizedDescription = {
  architecture: "x86_64h",
  errorDomain: "RCTErrorDomain",
  initialHandler: "RCTSetFatalHandler",
  localizedDescription: `Exception 'Testing native iOS exception' was thrown while invoking throwErr on target ThrowErrModule with params (
  )
  callstack: (
    0   CoreFoundation                      0x00007ff8004288ab __exceptionPreprocess + 242
    1   libobjc.A.dylib                     0x00007ff80004dba3 objc_exception_throw + 48
    2   AwesomeProject                      0x0000000105861ab0 -[AppDelegate application:didFinishLaunchingWithOptions:] + 0
    3   CoreFoundation                      0x00007ff80042f2fc __invoking___ + 140
  )`,
  reactNativeStackTrace: [],
  type: "Error",
}

describe('iosUtils', () => {
  describe('errorMessageFromIosException', () => {
    it('pulls the message from the localizedDescription, cutting the call stack', () => { 
      const result = errorMessageFromIosException(dataWithLocalizedDescription)
      expect(result).toBe(`Exception 'Testing native iOS exception' was thrown while invoking throwErr on target ThrowErrModule with params (\n  )`)
    })

    it('pulls the first line of the localizedDescription if there is no call stack', () => { 
      const data = {
        localizedDescription: `This is the first line
        and this is the second`,
        type: "Error",
      }
      const result = errorMessageFromIosException(data)
      expect(result).toBe('This is the first line')
    })

    it('uses name and reason if localizedDescription is missing', () => { 
      const data = {
        name: 'Sample_iOS_Exception', 
        reason: 'Testing native iOS exception ',
        type: "Error",
      }
      const result = errorMessageFromIosException(data)
      expect(result).toBe('Sample_iOS_Exception : Testing native iOS exception')
    })
  })

  describe('backtraceAndDetailsFromIosException', () => {
    // TODO
    it('returns a backtrace and details from the iOSCallStack', () => {

    })
  })

  describe('framesFromComponentStack', () => {
    // TODO
    it('does stuff', () => {

    })
  })

  describe('framesFromReactNativeIosStack', () => {
    // TODO
    it('does stuff', () => {

    })
  })

  describe('framesFromIOSCallStack', () => {
    it('returns the localizedDescription call stack parsed into an array', () => {
      expect(framesFromIOSCallStack(dataWithLocalizedDescription)).toStrictEqual([
        {
          file: "CoreFoundation",
          line: "",
          method: "__exceptionPreprocess",
          stack_address: "0x00007ff8004288ab",
        }, 
        {
          file: "libobjc.A.dylib",
          line: "",
          method: "objc_exception_throw",
          stack_address: "0x00007ff80004dba3",
        },
        {
          file: "AwesomeProject",
          line: "",
          method: "-[AppDelegate application:didFinishLaunchingWithOptions:]",
          stack_address: "0x0000000105861ab0",
        },
        {
          file: "CoreFoundation",
          line: "",
          method: "__invoking___",
          stack_address: "0x00007ff80042f2fc",
        },
      ])
    })
  })
})
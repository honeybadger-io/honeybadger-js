import { backtraceFromAndroidException } from '../src/androidUtils'

// Pulled this example data from a native error thrown in 
// examples/react-native-cli running in dev mode (npm run android)
// Shortened the callstack for simplicity
const data = {
  stackTrace: [
    {
      line: 30,
      class: "com.awesomeproject.ThrowErrModule$1",
      method: "run",
      file: "ThrowErrModule.java"
    },
    {
      line: 938,
      class: "android.os.Handler",
      method: "handleCallback",
      file: "Handler.java"
    },
    {
      line: 99,
      class: "android.os.Handler",
      method: "dispatchMessage",
      file: "Handler.java"
    },
  ],
  message: "Test Delayed Exception",
  type: "Exception"
}

describe('androidUtils', () => {
  describe('backtraceFromAndroidException', () => {
    it('returns an empty array if stackTrace is missing', () => {
      const result = backtraceFromAndroidException({ type: 'error'})
      expect(result).toStrictEqual([])
    })

    it('returns an array of frames', () => {
      const result = backtraceFromAndroidException(data)
      expect(result).toStrictEqual([
        {
          method: 'com.awesomeproject.ThrowErrModule$1.run',
          file: 'ThrowErrModule.java',
          number: 30,
        }, 
        {
          method: 'android.os.Handler.handleCallback',
          file: 'Handler.java',
          number: 938,
        },
        {
          method: "android.os.Handler.dispatchMessage",
          file: "Handler.java", 
          number: 99,
        }       
      ])
    })
  })
})
import { backtraceFromAndroidException } from '../src/androidUtils'

describe('androidUtils', () => {
  describe('backtraceFromAndroidException', () => {
    it('returns an empty array if stackTrace is missing', () => {
      const result = backtraceFromAndroidException({ type: 'error'})
      expect(result).toStrictEqual([])
    })

    it('returns an array of frames', () => {
      const stackTrace = [
        {
          class: 'com.awesomeproject.ThrowErrModule$1',
          file: 'ThrowErrModule.java',
          line: 30,
          method: 'run',
        },
        {
          file: 'Handler.java',
          line: 938,
          method: 'handleCallback',
        },
      ]
      const result = backtraceFromAndroidException({ type: 'error', stackTrace})
      expect(result).toStrictEqual([
        {
          method: 'com.awesomeproject.ThrowErrModule$1.run',
          file: 'ThrowErrModule.java',
          number: 30,
        }, 
        {
          method: 'handleCallback',
          file: 'Handler.java',
          number: 938,
        },
      ])
    })
  })
})
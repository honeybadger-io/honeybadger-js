import { Util } from '@honeybadger-io/core'
import { getSourceFile } from '../../../src/server/util'

const { getSourceForBacktrace, makeBacktrace, makeNotice } = Util

// this is in a separate file, because we are actually testing the line number of the code
describe('getSourceForBacktrace', function () {
  it('returns a parsed stacktrace in Honeybadger format', async function notAnonymous() {
    const error = new Error('this is an error from tests')
    const notice = makeNotice(error)
    notice.backtrace = makeBacktrace(notice.stack)
    expect(notice.backtrace[0]).toEqual({
      file: __filename,
      method: 'Object.<anonymous>',
      number: 9,
      column: 19,
    })

    const backtrace = await getSourceForBacktrace(notice.backtrace, getSourceFile)
    expect(backtrace[0]).toEqual({
      '7': 'describe(\'getSourceForBacktrace\', function () {',
      '8': '  it(\'returns a parsed stacktrace in Honeybadger format\', async function notAnonymous() {',
      '9': '    const error = new Error(\'this is an error from tests\')',
      '10': '    const notice = makeNotice(error)',
      '11': '    notice.backtrace = makeBacktrace(notice.stack)'
    })
  })
})

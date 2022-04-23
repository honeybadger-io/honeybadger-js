import { getSourceForBacktrace, makeBacktrace, makeNotice } from '../../../src/core/util';
import { getSourceFile } from '../../../src/server/util';

// this is in a separate file, because we are actually testing the line number of the code
describe('makeBacktrace', function () {
  it('returns a parsed stacktrace in Honeybadger format', async function notAnonymous() {
    const error = new Error('this is an error from tests')
    const notice = makeNotice(error)
    notice.backtrace = makeBacktrace(notice.stack, 0)
    expect(notice.backtrace[0]).toEqual({
      file: __filename,
      method: 'Object.<anonymous>',
      number: 7,
      column: 19,
    })

    const backtrace = await getSourceForBacktrace(notice.backtrace, getSourceFile)
    expect(backtrace[0]).toEqual({
      '5': 'describe(\'makeBacktrace\', function () {',
      '6': '  it(\'returns a parsed stacktrace in Honeybadger format\', async function notAnonymous() {',
      '7': '    const error = new Error(\'this is an error from tests\')',
      '8': '    const notice = makeNotice(error)',
      '9': '    notice.backtrace = makeBacktrace(notice.stack, 0)'
    })
  })

  it('returns an empty array when no stack is undefined', function () {
    const backtrace = makeBacktrace(undefined, 0)
    expect(backtrace).toEqual([])
  })
})

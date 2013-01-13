goog.provide 'notice.spec'

goog.require 'honeybadger'

describe 'Notice', ->
  describe 'context option', ->
    it 'allows setting context from options array', ->
      Honeybadger.resetContext()
      notice = new Notice(context: { user_id: '1' })
      expect(notice.context).toEqual({ user_id: '1' })

    it 'overrides global context without changing it', ->
      Honeybadger.resetContext({ user_id: '2', user_name: 'Jack' })
      notice = new Notice(context: { user_id: '1' })
      expect(notice.context).toEqual({ user_id: '1', user_name: 'Jack' })
      expect(Honeybadger.context).toEqual({ user_id: '2', user_name: 'Jack' })

  describe '#_parseBacktrace', ->
    it 'applies [PROJECT_ROOT] filter', ->
      Honeybadger.configuration.project_root = 'http://www.project_root.foo'
      notice = new Notice()
      stack = [{ url: 'http://www.project_root.foo/file.js', line: '43', func: 'function' }]
      expect(notice._parseBacktrace(stack)).toEqual([{ file: '[PROJECT_ROOT]/file.js', number: '43', method: 'function' }])

    it 'skips traces in honeybadger.js', ->
      notice = new Notice()
      stack = [{ url: 'http://www.project_root.foo/honeybadger.js', line: '43', func: 'function' }]
      expect(notice._parseBacktrace(stack)).toEqual([])

    it 'skips traces in honeybadger.min.js', ->
      notice = new Notice()
      stack = [{ url: 'http://www.project_root.foo/honeybadger.min.js', line: '43', func: 'function' }]
      expect(notice._parseBacktrace(stack)).toEqual([])

  describe '#toJSON()', ->
    it 'is defined', ->
      notice = new Notice
      expect(notice.toJSON).toBeDefined()

    describe 'error is present', ->
      [error, notice, output] = [null, null, null]

      beforeEach () ->
        try
          'foo'.bar()
        catch e
          error = e

        notice = new Notice({ error: error })
        output = JSON.parse(notice.toJSON())

      describe 'error', ->
        it 'exists', ->
          expect(output.error).toBeDefined()

        it 'has backtrace', ->
          expect(output.error.backtrace).toBeDefined()

        it 'has source extract', ->
          expect(output.error.source).toBeDefined()

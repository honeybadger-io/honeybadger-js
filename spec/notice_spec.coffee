describe 'Notice', ->
  describe 'context option', ->
    it 'allows setting context from options array', ->
      Honeybadger.resetContext()
      notice = new Honeybadger.Notice(context: { user_id: '1' })
      expect(notice.context).toEqual({ user_id: '1' })

    it 'overrides global context without changing it', ->
      Honeybadger.resetContext({ user_id: '2', user_name: 'Jack' })
      notice = new Honeybadger.Notice(context: { user_id: '1' })
      expect(notice.context).toEqual({ user_id: '1', user_name: 'Jack' })
      expect(Honeybadger.context).toEqual({ user_id: '2', user_name: 'Jack' })

  describe '#_parseBacktrace', ->
    it 'matches lines by format', ->
      #notice = new Honeybadger.Notice()
      #lines = ['method (file:43:23)']
      #expect(notice._parseBacktrace(lines)).toEqual([{ method: 'method', file: 'file', number: '43' }])

    it 'applies [PROJECT_ROOT] filter', ->
      #Honeybadger.configuration.project_root = 'http://www.project_root.foo'
      #notice = new Honeybadger.Notice()
      #lines = ['method (http://www.project_root.foo/file.js:43:23)']
      #expect(notice._parseBacktrace(lines)).toEqual([{ method: 'method', file: '[PROJECT_ROOT]/file.js', number: '43' }])

  describe '#toJSON()', ->
    it 'is defined', ->
      notice = new Honeybadger.Notice
      expect(notice.toJSON).toBeDefined()

    describe 'error is present', ->
      [error, notice, output] = [null, null, null]

      beforeEach () ->
        try
          'foo'.bar()
        catch e
          error = e

        notice = new Honeybadger.Notice({ error: error })
        output = JSON.parse(notice.toJSON())

      describe 'error', ->
        it 'exists', ->
          expect(output.error).toBeDefined()

        it 'has backtrace', ->
          expect(output.error.backtrace).toBeDefined()

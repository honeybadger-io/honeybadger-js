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
      notice = new Honeybadger.Notice()
      lines = ['method (file:43:23)']
      expect(notice._parseBacktrace(lines)).toEqual([{ method: 'method', file: 'file', number: '43' }])

    it 'applies [PROJECT_ROOT] filter', ->
      Honeybadger.configuration.project_root = 'http://www.project_root.foo'
      notice = new Honeybadger.Notice()
      lines = ['method (http://www.project_root.foo/file.js:43:23)']
      expect(notice._parseBacktrace(lines)).toEqual([{ method: 'method', file: '[PROJECT_ROOT]/file.js', number: '43' }])

  describe '#_parseBacktraceLine', ->
    notice = new Honeybadger.Notice

    it 'parses unsupported lines', ->
      expect(notice._parseBacktraceLine('{anonymous}()')).toEqual(['{anonymous}()', 'unsupported.js', '0'])
      expect(notice._parseBacktraceLine('boom()')).toEqual(['boom()', 'unsupported.js', '0'])

    it 'parses Firefox/Safari style lines', ->
      expect(notice._parseBacktraceLine('boom@https://dl.dropbox.com/u/10352850/boom.js:17')).toEqual(['boom', 'https://dl.dropbox.com/u/10352850/boom.js', '17'])
      expect(notice._parseBacktraceLine('{anonymous}()@https://dl.dropbox.com/u/10352850/boom.js:37')).toEqual(['{anonymous}()', 'https://dl.dropbox.com/u/10352850/boom.js', '37'])
      expect(notice._parseBacktraceLine('global code@https://dl.dropbox.com/u/10352850/boom.js:38')).toEqual(['global code', 'https://dl.dropbox.com/u/10352850/boom.js', '38'])

    it 'parses IE 10 style lines', ->
      expect(notice._parseBacktraceLine('boom@https://dl.dropbox.com/u/10352850/boom.js:17:7')).toEqual(['boom', 'https://dl.dropbox.com/u/10352850/boom.js', '17'])
      expect(notice._parseBacktraceLine('{anonymous}()@(https://dl.dropbox.com/u/10352850/boom.js:37:1)')).toEqual(['{anonymous}()', 'https://dl.dropbox.com/u/10352850/boom.js', '37'])
      expect(notice._parseBacktraceLine('at Global code (https://dl.dropbox.com/u/10352850/boom.js:36:2)')).toEqual(['at Global code', 'https://dl.dropbox.com/u/10352850/boom.js', '36'])

    it 'parses chrome style lines', ->
      expect(notice._parseBacktraceLine('boom (https://dl.dropbox.com/u/10352850/boom.js:17:7)')).toEqual(['boom', 'https://dl.dropbox.com/u/10352850/boom.js', '17'])
      expect(notice._parseBacktraceLine('{anonymous}()@https://dl.dropbox.com/u/10352850/boom.js:37:1')).toEqual(['{anonymous}()', 'https://dl.dropbox.com/u/10352850/boom.js', '37'])

    it 'parses Opera style lines', ->
      expect(notice._parseBacktraceLine('boom()@https://dl.dropbox.com/u/10352850/boom.js:17:6 -- foosjdgoj')).toEqual(['boom()', 'https://dl.dropbox.com/u/10352850/boom.js', '17'])
      expect(notice._parseBacktraceLine('{anonymous}()@https://dl.dropbox.com/u/10352850/boom.js:37:0 -- bang();')).toEqual(['{anonymous}()', 'https://dl.dropbox.com/u/10352850/boom.js', '37'])
      expect(notice._parseBacktraceLine('global code@https://dl.dropbox.com/u/10352850/boom.js:36:0 -- (function(){')).toEqual(['global code', 'https://dl.dropbox.com/u/10352850/boom.js', '36'])

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

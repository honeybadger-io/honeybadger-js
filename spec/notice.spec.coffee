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

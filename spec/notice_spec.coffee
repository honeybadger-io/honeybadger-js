describe 'Notice', ->
  subject = new Honeybadger.Notice

  describe 'context option', ->
    it 'allows setting context from options array', ->
      Honeybadger.reset_context()
      notice = new Honeybadger.Notice(context: { user_id: '1' })
      expect(notice.context).toEqual({ user_id: '1' })

    it 'overrides global context without changing it', ->
      Honeybadger.reset_context({ user_id: '2', user_name: 'Jack' })
      notice = new Honeybadger.Notice(context: { user_id: '1' })
      expect(notice.context).toEqual({ user_id: '1', user_name: 'Jack' })
      expect(Honeybadger.context).toEqual({ user_id: '2', user_name: 'Jack' })

  describe '#toJSON()', ->
    it 'is defined', ->
      expect(subject.toJSON).toBeDefined()

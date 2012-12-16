describe 'Notice', ->
  subject = new Honeybadger.Notice

  describe '#toJSON()', ->
    it 'is defined', ->
      expect(subject.toJSON).toBeDefined()

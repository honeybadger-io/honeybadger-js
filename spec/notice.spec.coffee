describe 'Notice', ->
  mockError = () ->
    error = null
    try
      'foo'.bar()
    catch e
      error = e
    error


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

  describe '#payload()', ->
    it 'is defined', ->
      notice = new Notice
      expect(notice.payload).toBeDefined()

    describe 'error is present', ->
      [error, notice, output] = [null, null, null]

      beforeEach () ->
        e = mockError()
        notice = new Notice({ stack: e.stack, message: e.message, name: e.name })
        output = notice.payload()

      describe 'server', ->
        it 'exists', ->
          expect(output.server).toBeDefined()

      describe 'error', ->
        it 'exists', ->
          expect(output.error).toBeDefined()

        it 'has backtrace', ->
          expect(output.error.backtrace).toBeDefined()

        it 'has source extract', ->
          expect(output.error.source).toBeDefined()

        it 'doesn\'t have a fingerprint by default', ->
          expect(output.error.fingerprint).toEqual(null)

      describe "cyclic structures in payload", ->
        it "converts cyclic structures", ->
          e = mockError()
          c = { "foo": "bar" }
          c["c"] = c
          notice = new Notice({ stack: e.stack, message: e.message, name: e.name, context: c })
          json = JSON.stringify(notice.payload()) # shouldn't cause error.
          expect(json.match(/CIRCULAR DATA STRUCTURE/g).length).toEqual(1)

        it 'converts arrays in context', ->
          Array.prototype.blah = -> 'whatevs'
          e = mockError()
          c = { "foo": ['boo'], 'bar': ['baz'] }
          notice = new Notice({ stack: e.stack, message: e.message, name: e.name, context: c })
          json = JSON.stringify(notice.payload()) # shouldn't cause error.
          expect(json.match(/CIRCULAR DATA STRUCTURE/g)).toBeNull()

  describe 'with a fingerprint', ->
    describe '#payload()', ->
      it 'has a fingerprint', ->
        notice = new Notice({ fingerprint: 'asdf' })
        output = notice.payload()
        expect(output.error.fingerprint).toBeDefined()
        expect(output.error.fingerprint).toEqual('asdf')

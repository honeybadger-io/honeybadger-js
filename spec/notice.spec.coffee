describe 'Notice', ->
  mockError = () ->
    error = null
    try
      'foo'.bar()
    catch e
      error = e
    error

  describe 'defaults', ->
    [notice, output] = [null, null, null]

    beforeEach () ->
      notice = new Notice
      output = notice.payload()

    describe 'error payload', ->
      it 'exists', ->
        expect(output.error).toBeDefined()

      it 'has a default message', ->
        expect(output.error.message).toMatch(/message/)

      it 'has a default class', ->
        expect(output.error.class).toEqual('Error')

      it 'has a null backtrace', ->
        expect(output.error.backtrace).toEqual(null)

      it 'has source extract', ->
        expect(output.error.source).toBeDefined()

      it 'doesn\'t have a fingerprint by default', ->
        expect(output.error.fingerprint).toEqual(null)

    describe 'request payload', ->
      it 'exists', ->
        expect(output.request).toBeDefined()

      it 'sends a null action', ->
        expect(output.request.action).toEqual(null)

      it 'sends a null component', ->
        expect(output.request.component).toEqual(null)

    describe 'server payload', ->
      it 'exists', ->
        expect(output.server).toBeDefined()

  describe 'with options', ->
    it 'overrides the message', ->
      output = new Notice({ message: "Badgers" }).payload()
      expect(output.error.message).toEqual("Badgers")

    it 'overrides the class', ->
      output = new Notice({ name: "Badgers" }).payload()
      expect(output.error.class).toEqual("Badgers")

    it 'overrides the backtrace', ->
      output = new Notice({ stack: "foo" }).payload()
      expect(output.error.backtrace).toEqual("foo")

    it 'overrides the component', ->
      output = new Notice({ component: "Badgers" }).payload()
      expect(output.request.component).toEqual("Badgers")

  describe 'options which should be strings', ->
    it 'converts the message to a string', ->
      output = new Notice({ message: { badgers: true } }).payload()
      expect(output.error.message).toEqual("[object Object]")

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
    it 'adds fingerprint to payload', ->
      notice = new Notice({ fingerprint: 'asdf' })
      output = notice.payload()
      expect(output.error.fingerprint).toBeDefined()
      expect(output.error.fingerprint).toEqual('asdf')

  describe "#_sanitize()", ->
    notice = new Notice()
    sanitize = notice._sanitize

    it "rejects cyclic objects", ->
      o = {}
      o.foo = o
      expect(sanitize(o)).toEqual({ foo: "[CIRCULAR DATA STRUCTURE]" })

      a = []
      a.push(a)
      expect(sanitize(a)).toEqual([ "[CIRCULAR DATA STRUCTURE]" ])

    it "doesn't reject similar objects", ->
      o = {}
      o.foo = {}
      expect(sanitize(o)).toEqual(o)
      a = []
      a.push([])
      expect(sanitize(a)).toEqual(a)

    it 'converts arrays', ->
      c = { "foo": ['boo'], 'bar': ['baz'] }
      expect(sanitize(c)).toEqual(c)

    it 'converts functions', ->
      o = { foo: () -> console.log("foo") }
      expect(sanitize(o)).toEqual({ foo: "[FUNC]" })

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

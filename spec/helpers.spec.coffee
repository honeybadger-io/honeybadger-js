describe 'helpers', ->
  describe "sanitize()", ->
    sanitize = helpers.sanitize

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

    it 'traverses deeply nested objects', ->
      o = { foo: "bar", bar: { baz: "badgers", cobras: { traits: ['deadly', 'fast'], bite: { badgers: { care: false } } } } }
      expect(sanitize(o)).toEqual(o)

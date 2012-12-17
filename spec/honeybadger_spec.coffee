describe 'Honeybadger', ->
  beforeEach: ->
    Honeybadger.configuration.reset()

  it 'has a configuration object', ->
    expect(Honeybadger.configuration).toBeDefined()

  describe '.configure', ->
    it 'configures Honeybadger', ->
      expect(Honeybadger.configure).toBeDefined()

      Honeybadger.configure
        api_key: 'asdf'

      expect(Honeybadger.configuration.api_key).toEqual('asdf')

    it 'is chainable', ->
      expect(Honeybadger.configure({})).toBe(Honeybadger)

  it 'has a context object', ->
    expect(Honeybadger.context).toBeDefined()

  describe '.set_context', ->
    it 'merges existing context', ->
      Honeybadger.set_context({ user_id: '1' })
      Honeybadger.set_context({ foo: 'bar' })
      expect(Honeybadger.context.user_id).toBeDefined()
      expect(Honeybadger.context['user_id']).toEqual('1')
      expect(Honeybadger.context.foo).toBeDefined()
      expect(Honeybadger.context['foo']).toEqual('bar')

    it 'is chainable', ->
      expect(Honeybadger.set_context({ user_id: 1 })).toBe(Honeybadger)

  describe '.reset_context', ->
    it 'empties the context with no arguments', ->
      Honeybadger.set_context({ user_id: '1' })
      Honeybadger.reset_context()
      expect(Honeybadger.context).toEqual({})

    it 'replaces the context with arguments', ->
      Honeybadger.set_context({ user_id: '1' })
      Honeybadger.reset_context({ foo: 'bar' })
      expect(Honeybadger.context).toEqual({ foo: 'bar' })

    it 'is chainable', ->
      expect(Honeybadger.reset_context()).toBe(Honeybadger)

  it 'responds to notify', ->
    expect(Honeybadger.notify).toBeDefined()

  describe '.notify', ->
    it 'logs the notice JSON', ->
      spyOn(console, 'log').andCallThrough()
      expected_error = null

      Honeybadger.configure
        api_key: 'asdf'
        ssl: false
        host: 'api.honeybadger.dev'

      try
        'foo'.bar()
      catch error
        expected_error = error
        Honeybadger.notify(error)

      notice = new Honeybadger.Notice({ error: expected_error })
      expect(console.log).toHaveBeenCalledWith(notice.toJSON())

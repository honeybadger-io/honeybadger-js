describe 'Honeybadger', ->
  beforeEach () ->
    Honeybadger.configuration.reset()
    Honeybadger.resetContext()

  it 'has a configuration object', ->
    expect(Honeybadger.configuration).toBeDefined()

  describe '.configure', ->
    it 'configures Honeybadger', ->
      expect(Honeybadger.configure).toBeDefined()

      Honeybadger.configure
        api_key: 'asdf'

      expect(Honeybadger.configuration.api_key).toEqual('asdf')

    it 'enables notifications on first call', ->
      expect(Honeybadger.configuration.disabled).toEqual(true)
      Honeybadger.configure
          api_key: 'asdf'
      expect(Honeybadger.configuration.disabled).toEqual(false)

    it 'leaves notifications disabled on subsequent call', ->
      expect(Honeybadger.configuration.disabled).toEqual(true)
      Honeybadger.configure
          api_key: 'asdf'
          disabled: true
      Honeybadger.configure
          api_key: 'zxcv'
      expect(Honeybadger.configuration.disabled).toEqual(true)

    it 'is chainable', ->
      expect(Honeybadger.configure({})).toBe(Honeybadger)

  it 'has a context object', ->
    expect(Honeybadger.context).toBeDefined()

  describe '.setContext', ->
    it 'merges existing context', ->
      Honeybadger.setContext({ user_id: '1' })
      Honeybadger.setContext({ foo: 'bar' })
      expect(Honeybadger.context.user_id).toBeDefined()
      expect(Honeybadger.context['user_id']).toEqual('1')
      expect(Honeybadger.context.foo).toBeDefined()
      expect(Honeybadger.context['foo']).toEqual('bar')

    it 'is chainable', ->
      expect(Honeybadger.setContext({ user_id: 1 })).toBe(Honeybadger)

    it 'does not accept non-objects', ->
      Honeybadger.setContext('foo')
      expect(Honeybadger.context).toEqual({})

    it 'keeps previous context when called with non-object', ->
      Honeybadger.setContext({ foo: 'bar' })
      Honeybadger.setContext(false)
      expect(Honeybadger.context).toEqual({ foo: 'bar' })

  describe '.resetContext', ->
    it 'empties the context with no arguments', ->
      Honeybadger.setContext({ user_id: '1' })
      Honeybadger.resetContext()
      expect(Honeybadger.context).toEqual({})

    it 'replaces the context with arguments', ->
      Honeybadger.setContext({ user_id: '1' })
      Honeybadger.resetContext({ foo: 'bar' })
      expect(Honeybadger.context).toEqual({ foo: 'bar' })

    it 'empties the context with non-object argument', ->
      Honeybadger.setContext({ foo: 'bar' })
      Honeybadger.resetContext('foo')
      expect(Honeybadger.context).toEqual({})

    it 'is chainable', ->
      expect(Honeybadger.resetContext()).toBe(Honeybadger)

  it 'responds to notify', ->
    expect(Honeybadger.notify).toBeDefined()

  describe '.notify', ->
    beforeEach () ->
      spyOn(Honeybadger, '_sendRequest')
      notice = null

    it 'delivers the notice when enabled', ->
      Honeybadger.configure
        api_key: 'asdf'

      try
        'foo'.bar()
      catch e
        Honeybadger.notify(e)
        notice = new Notice({ error: e })

      expect(Honeybadger._sendRequest).toHaveBeenCalledWith(notice.toJSON())

    it 'does not deliver notice when not configured', ->
      try
        'foo'.bar()
      catch e
        Honeybadger.notify(e)
        notice = new Notice({ error: e })

      expect(Honeybadger._sendRequest).not.toHaveBeenCalled()

    it 'does not deliver notice when disabled', ->
      Honeybadger.configure
        api_key: 'asdf',
        disabled: true

      try
        'foo'.bar()
      catch e
        Honeybadger.notify(e)
        notice = new Notice({ error: e })

      expect(Honeybadger._sendRequest).not.toHaveBeenCalled()

    it 'does not deliver notice when beforeNotify returns false', ->
      Honeybadger.configure
        api_key: 'asdf',
        beforeNotify: () -> false

      try
        'foo'.bar()
      catch e
        Honeybadger.notify(e)
        notice = new Notice({ error: e })

      expect(Honeybadger._sendRequest).not.toHaveBeenCalled()

    it 'delivers notice when beforeNotify returns true', ->
      Honeybadger.configure
        api_key: 'asdf',
        beforeNotify: () -> true

      try
        'foo'.bar()
      catch e
        Honeybadger.notify(e)
        notice = new Notice({ error: e })

      expect(Honeybadger._sendRequest).toHaveBeenCalled()

    it 'delivers notice when beforeNotify has no return', ->
      Honeybadger.configure
        api_key: 'asdf',
        beforeNotify: () ->

      try
        'foo'.bar()
      catch e
        Honeybadger.notify(e)
        notice = new Notice({ error: e })

      expect(Honeybadger._sendRequest).toHaveBeenCalled()

  describe '._handleTraceKitSubscription', ->
    beforeEach () ->
      spyOn Honeybadger, 'notify'

    describe 'default behavior', ->
      it 'ignores unhandled errors', ->
        window.onerror 'testing', 'http://foo.bar', '123'
        expect(Honeybadger.notify).not.toHaveBeenCalled()

    describe 'when onerror is enabled', ->
      beforeEach () ->
        Honeybadger.configure
          api_key: 'asdf',
          onerror: true

      it 'notifies Honeybadger of unhandled exceptions', ->
        stackInfo = 'foo'
        window.onerror 'testing', 'http://foo.bar', '123'

        expect(Honeybadger.notify).toHaveBeenCalledWith(null, jasmine.any(Object))

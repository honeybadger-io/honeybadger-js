goog.provide 'honeybadger.spec'

goog.require 'honeybadger'

describe 'Honeybadger', ->
  beforeEach () ->
    Honeybadger.configuration.reset()

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

  describe '.resetContext', ->
    it 'empties the context with no arguments', ->
      Honeybadger.setContext({ user_id: '1' })
      Honeybadger.resetContext()
      expect(Honeybadger.context).toEqual({})

    it 'replaces the context with arguments', ->
      Honeybadger.setContext({ user_id: '1' })
      Honeybadger.resetContext({ foo: 'bar' })
      expect(Honeybadger.context).toEqual({ foo: 'bar' })

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

  describe '._handleTraceKitSubscription', ->
    it 'notifies Honeybadger of unhandled exceptions', ->
      spyOn Honeybadger, 'notify'

      Honeybadger.configure
       api_key: 'asdf'

      stackInfo = 'foo'
      Honeybadger._handleTraceKitSubscription(stackInfo)

      expect(Honeybadger.notify).toHaveBeenCalledWith(null, { stackInfo: stackInfo })

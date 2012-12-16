describe 'Honeybadger', ->
  beforeEach: ->
    Honeybadger.configuration.reset()

  it 'has a configuration object', ->
    expect(Honeybadger.configuration).toBeDefined()

  it 'is configurable via #configure', ->
    expect(Honeybadger.configure).toBeDefined()

    Honeybadger.configure
      api_key: 'asdf'

    expect(Honeybadger.configuration.api_key).toEqual('asdf')

  it 'responds to notify', ->
    expect(Honeybadger.notify).toBeDefined()

  describe 'notify', ->
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

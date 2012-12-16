describe 'Honeybadger', ->
  it 'has a configuration instance', ->
    expect(Honeybadger.configuration).toBeDefined()

  it 'is configurable via #configure', ->
    expect(Honeybadger.configure).toBeDefined()

    Honeybadger.configure
      api_key: 'asdf'

    expect(Honeybadger.configuration.api_key).toEqual('asdf')

  it 'responds to notify', ->
    expect(Honeybadger.notify).toBeDefined()

  describe 'notify', ->
    it 'logs the stack trace', ->
      spyOn(console, 'log')
      expected_error = null

      try
        'foo'.bar()
      catch error
        expected_error = error
        Honeybadger.notify(error)

      expect(console.log).toHaveBeenCalledWith(printStackTrace({e: expected_error}))

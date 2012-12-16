describe 'Configuration', ->
  subject = new Honeybadger.Configuration

  it 'has an api key', ->
    expect(subject.api_key).toBeDefined()
    expect(subject.api_key).toBeNull()

  it 'sets the api key', ->
    subject.api_key = 'asdf'
    expect(subject.api_key).toEqual('asdf')

  it 'has a host', ->
    expect(subject.host).toBeDefined()
    expect(subject.host).toEqual('api.honeybadger.io')

  it 'sets the host', ->
    subject.host = 'asdf'
    expect(subject.host).toEqual('asdf')

  it 'has ssl option', ->
    expect(subject.ssl).toBeDefined()
    expect(subject.ssl).toBe(true)

  it 'sets the ssl option', ->
    subject.ssl = false
    expect(subject.ssl).toBe(false)

describe 'Configuration', ->
  subject = Honeybadger.configuration

  beforeEach () ->
    subject.reset()

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

  it 'has project_root', ->
    expect(subject.project_root).toBeDefined()
    expect(subject.project_root).toEqual('file://')

  it 'sets the project_root', ->
    subject.project_root = 'http://foo.bar'
    expect(subject.project_root).toEqual('http://foo.bar')

  it 'has environment', ->
    expect(subject.environment).toBeDefined()
    expect(subject.environment).toEqual('production')

  it 'sets the environment', ->
    subject.environment = 'staging'
    expect(subject.environment).toEqual('staging')

  it 'has component', ->
    expect(subject.component).toBeDefined()
    expect(subject.component).toEqual(null)

  it 'sets the component', ->
    subject.component = 'n00bs'
    expect(subject.component).toEqual('n00bs')

  it 'has action', ->
    expect(subject.action).toBeDefined()
    expect(subject.action).toEqual(null)

  it 'sets the action', ->
    subject.action = 'pwn'
    expect(subject.action).toEqual('pwn')

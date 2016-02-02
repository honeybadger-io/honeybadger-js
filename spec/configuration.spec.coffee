describe 'Configuration', ->
  subject = null
  beforeEach () ->
    subject = new Configuration()

  it 'has an api key', ->
    expect(subject.api_key).toBeDefined()
    expect(subject.api_key).toBeNull()

  it 'has a host', ->
    expect(subject.host).toBeDefined()
    expect(subject.host).toEqual('api.honeybadger.io')

  it 'has ssl option', ->
    expect(subject.ssl).toBeDefined()
    expect(subject.ssl).toBe(true)

  it 'has project_root', ->
    expect(subject.project_root).toBeDefined()
    expect(subject.project_root).toEqual(window.location.protocol + '//' + window.location.host)

  it 'has environment', ->
    expect(subject.environment).toBeDefined()
    expect(subject.environment).toEqual('production')

  it 'has component', ->
    expect(subject.component).toBeDefined()
    expect(subject.component).toEqual(null)

  it 'sets the component', ->
    subject.component = 'n00bs'
    expect(subject.component).toEqual('n00bs')

  it 'has action', ->
    expect(subject.action).toBeDefined()
    expect(subject.action).toEqual(null)

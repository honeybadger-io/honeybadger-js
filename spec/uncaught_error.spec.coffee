describe 'UncaughtError', ->
  it 'is a kind of Error', ->
    expect(new UncaughtError()).toEqual(jasmine.any(Error))

  it 'assigns name', ->
    expect(new UncaughtError().name).toEqual('window.onerror')

  it 'constructs a stack', ->
    expect(new UncaughtError('Message', 'file', 1, 2).stack).toEqual('Message\n    at ? (file:1:2)')

  it 'constructs a default stack', ->
    expect(new UncaughtError().stack).toEqual('An unknown error was caught by window.onerror.\n    at ? (unknown:0:0)')

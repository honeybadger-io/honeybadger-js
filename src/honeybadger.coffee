Honeybadger =
  version: '0.0.4'

  TraceKit: TraceKit.noConflict()

  configured: false

  configure: (options = {}) ->
    app = options.app || 'default'
    @configuration[app] ||= new Configuration()

    if @configured == false
      options['disabled'] = false if typeof options.disabled == 'undefined'
    for k,v of options
      @configuration[app][k] = v

    if @configured == false
      @configured = true
      @configuration.default = @configuration[app]

    @TraceKit.collectWindowErrors = @configuration[app].onerror
    @

  configuration:
    default:
      new Configuration()

  context: {}

  resetContext: (options = {}) ->
    @context = if options instanceof Object then options else {}
    @

  setContext: (options = {}) ->
    if options instanceof Object
      for k,v of options
        @context[k] = v
    @

  beforeNotifyHandlers: []
  beforeNotify: (handler) ->
    @beforeNotifyHandlers.push handler

  notify: (error, app, options = {}) ->
    return false if !@configured || @configuration.default.disabled == true

    if app instanceof Object
      options = app

    if error instanceof Error
      options['error'] = error
    else if typeof(error) == 'string'
      options['error'] = new Error(error)
    else if error instanceof Object
      for k,v of error
        options[k] = v

    app ||= options.app || 'default'

    return false if (k for own k of options).length == 0
    notice = new Notice(options)
    (if handler(notice) == false then return false) for handler in @beforeNotifyHandlers
    @_sendRequest(notice.toJSON(), app)

  wrap: (func) ->
    () ->
      try
        func.apply(this, arguments)
      catch e
        Honeybadger.notify(e)
        throw e

  reset: () ->
    @resetContext()
    @configuration.default.reset()
    @TraceKit.collectWindowErrors = @configuration.default.onerror
    @configured = false
    @

  install: () ->
    @TraceKit.collectWindowErrors = @configuration.default.onerror
    @TraceKit.report.subscribe @_handleTraceKitSubscription
    @

  _sendRequest: (data, app) ->
    app ||= 'default'
    url = 'http' + ((@configuration[app].ssl && 's') || '' ) + '://' + @configuration[app].host + '/v1/notices.html'
    @_crossDomainPost(url, data, app)

  # http://www.markandey.com/2011/10/design-of-cross-domain-post-api-in.html
  _crossDomainPost: (url, payload, app) ->
    app ||= 'default'

    iframe = document.createElement('iframe')
    uniqueNameOfFrame = '_hb_' + (new Date).getTime()
    document.body.appendChild iframe
    iframe.style.display = 'none'
    iframe.contentWindow.name = uniqueNameOfFrame

    form = document.createElement('form')
    form.target = uniqueNameOfFrame
    form.action = url
    form.method = 'POST'

    input = document.createElement('input')
    input.type = 'hidden'
    input.name = "payload"
    input.value = payload
    form.appendChild input

    input = document.createElement('input')
    input.type = 'hidden'
    input.name = "api_key"
    input.value = @configuration[app].api_key
    form.appendChild input

    document.body.appendChild form
    form.submit()

  _handleTraceKitSubscription: (stackInfo) ->
    Honeybadger.notify(stackInfo: stackInfo)

Honeybadger =
  version: '0.1.0'

  configured: false

  configure: (options = {}) ->
    if @configured == false
      options['disabled'] = false if typeof options.disabled == 'undefined'
      @configured = true
    for k,v of options
      @configuration[k] = v
    @

  configuration: new Configuration()

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

  notify: (error, options = {}) ->
    return false if !@configured || @configuration.disabled == true

    if error instanceof Error
      options['error'] = error
    else if typeof(error) == 'string'
      options['error'] = new Error(error)
    else if error instanceof Object
      for k,v of error
        options[k] = v

    return false if (k for own k of options).length == 0
    notice = new Notice(options)
    (if handler(notice) == false then return false) for handler in @beforeNotifyHandlers
    @_sendRequest(notice.toJSON())

  wrap: (func) ->
    () ->
      try
        func.apply(this, arguments)
      catch e
        Honeybadger.notify(e)
        throw e

  reset: () ->
    @resetContext()
    @configuration.reset()
    @configured = false
    @

  install: () ->
    return if @installed == true
    @_oldOnErrorHandler = window.onerror
    window.onerror = @_windowOnErrorHandler
    @_installed = true
    @

  _sendRequest: (data) ->
    url = 'http' + ((@configuration.ssl && 's') || '' ) + '://' + @configuration.host + '/v1/notices.html'
    @_crossDomainPost(url, data)

  # http://www.markandey.com/2011/10/design-of-cross-domain-post-api-in.html
  _crossDomainPost: (url, payload) ->
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
    input.value = @configuration.api_key
    form.appendChild input

    document.body.appendChild form
    form.submit()

  _windowOnErrorHandler: (msg, url, line, col, error) ->
    if Honeybadger.configuration.onerror
      unless error
        # Default to v8 stack format
        stack = msg
        stack += '\n    at HTMLDocument.<anonymous> (' + url + ':' + line
        stack += ':' + col if col?
        stack += ')'
        error = new Error(msg)
        error.stack = stack
      Honeybadger.notify(error)
    if @_oldOnErrorHandler
      return @_oldOnErrorHandler.apply(this, arguments)
    false

class Notice
  constructor: (@options = {}) ->
    @error = @options.error
    @stack = @_stackTrace(@error)
    @class = @error?.name
    @message = @error?.message
    @source = null
    @url = document.URL
    @project_root = Honeybadger.configuration.project_root
    @environment = Honeybadger.configuration.environment
    @component = Honeybadger.configuration.component
    @action = Honeybadger.configuration.action
    @cgi_data = @_cgiData()
    @fingerprint = @options.fingerprint

    @context = {}
    for k,v of Honeybadger.context
      @context[k] = v
    if @options.context && typeof(@options.context) == 'object'
      for k,v of @options.context
        @context[k] = v

  payload: ->
    notifier:
      name: 'honeybadger.js'
      url: 'https://github.com/honeybadger-io/honeybadger-js'
      version: Honeybadger.version
      language: 'javascript'
    error:
      class: @class
      message: @message
      backtrace: @stack
      source: @source
      fingerprint: @fingerprint
    request:
      url: @url
      component: @component
      action: @action
      context: @context
      cgi_data: @cgi_data
    server:
      project_root: @project_root
      environment_name: @environment

  _stackTrace: (error) ->
    # From TraceKit: Opera 10 *destroys* its stacktrace property if you try to
    # access the stack property first!!
    error?.stacktrace || error?.stack || null

  _cgiData: () ->
    data = {}
    if navigator?
      for k,v of navigator
        if k? and v? and !(typeof v is 'object')
          data[k.replace(/(?=[A-Z][a-z]*)/g, '_').toUpperCase()] = v
      data['HTTP_USER_AGENT'] = data['USER_AGENT']
      delete data['USER_AGENT']
    data['HTTP_REFERER'] = document.referrer if document.referrer.match /\S/
    data

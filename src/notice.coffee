class Notice
  constructor: (opts = {}, config = Honeybadger.configuration) ->
    @stack = opts.stack
    @generator = opts.generator
    @class = opts.name || 'Error'
    @message = opts.message || 'No message provided'
    @source = null
    @url = document.URL
    @project_root = config.project_root
    @environment = config.environment
    @component = opts.component || config.component
    @action = opts.action || config.action
    @cgi_data = @_cgiData()
    @fingerprint = opts.fingerprint

    @context = {}
    for k,v of Honeybadger.context
      @context[k] = v
    if opts.context && typeof(opts.context) == 'object'
      for k,v of opts.context
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
      generator: @generator
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

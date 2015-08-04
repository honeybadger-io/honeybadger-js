class Notice
  constructor: (opts = {}, config = Honeybadger.configuration) ->
    @log = opts.log || ()->
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
    @_sanitize
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

  _sanitizeValue: (v, k, seen, new_obj) ->
    if v instanceof Object
      if v in seen
        @log("Dropping circular data structure.", k, v, new_obj)
        new_obj[k] = "[CIRCULAR DATA STRUCTURE]"
        return
      seen.push(v)
      new_obj[k] = @_sanitize(v, seen)
    else
      new_obj[k] = v

  _sanitize: (obj, seen = []) ->
    if obj instanceof Array
      new_obj = []
      for v, i in obj
        @_sanitizeValue(v, i, seen, new_obj)
    else
      new_obj = {}
      for k,v of obj
        @_sanitizeValue(v, k, seen, new_obj)
    new_obj

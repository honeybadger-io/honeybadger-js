[currentError, currentNotice] = [null, null]

class Client
  version: '0.2.0'

  constructor: (options) ->
    @log('Initializing honeybadger.js ' + @version)
    @configure(options) if options

  # Debug logging.
  #
  # http://paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
  #
  # Example
  #
  #   log('inside coolFunc',this,arguments);
  #
  # Returns nothing.
  log: () ->
    @log.history = @log.history || [] # store logs to an array for reference
    @log.history.push(arguments)
    if @configuration.debug && window.console
      console.log(Array.prototype.slice.call(arguments))

  configure: (options = {}) ->
    for k,v of options
      @configuration[k] = v
    if !@_configured && @configuration.debug && window.console
      console.log(Array.prototype.slice.call(args)) for args in @log.history
    @_configured = true
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

  # Public: Send an error notification to Honeybadger.
  #
  # error - The Error or String error to be sent.
  # name  - The String name to override error class name (optional).
  # opts  - The Object options for notification (default: {}):
  #         message     - The String error message (optional).
  #         name        - The String error class name (optional).
  #         fingerprint - The String fingerprint of error for grouping (optional).
  #         context     - Merge the Object context for error (optional).
  #         component   - Override the String component of page (optional).
  #         action      - Override the String action of page (optional).
  #
  # Examples
  #
  #   // Notifying Honeybadger of caught errors:
  #
  #   try {
  #     throw new Error('Badgers!');
  #   } catch(e) {
  #     Honeybadger.notify(e);
  #     Honeybadger.notify(e, { context: { foo: 'bar' } });
  #     Honeybadger.notify(e, 'DescriptiveClass');
  #     Honeybadger.notify(e, 'DescriptiveClass', { ... });
  #   }
  #
  #   // Notifying Honeybadger of other events:
  #
  #   Honeybadger.notify('Badgers!');
  #   Honeybadger.notify('Badgers!', { ... });
  #   Honeybadger.notify('Badgers!', 'CustomClass');
  #   Honeybadger.notify('Badgers!', 'CustomClass', { ... });
  #
  # Returns false if halted (see below), otherwise sent Notice.
  notify: (error, name, opts = {}) ->
    return false if !@_validConfig() || @configuration.disabled == true

    [stack, generator] = [undefined, undefined]

    # Fetch options from name if being called like `Honeybadger.notify(e, { context: {} })`.
    if name instanceof Object
      opts = name
      name = undefined
    else if name?
      opts['name'] = name

    # Fetch error from options if being called like `Honeybadger.notify({ error: e })`.
    if error instanceof Object && error.error?
      error = error.error
      error['error'] = undefined

    if error instanceof Error
      stack = @_stackTrace(error)
      opts['name'] ||= error.name
      opts['message'] ||= error.message
    else if typeof(error) == 'string'
      opts['message'] = error
    else if error instanceof Object
      for k,v of error
        opts[k] = v

    # Check if a notice is already being processed, or is waiting to be deferred.
    if currentNotice
      if error == currentError
        return # Already caught by inner catch block, ignore.
      else if @_loaded # otherwise it's already in the queue
        # Report old error immediately since this is a new error.
        @_send(currentNotice)

    return false if (k for own k of opts).length == 0

    [stack, generator] = @_generateStackTrace() unless stack

    # Override stack/generator in options (these are never user-configurable).
    [opts['stack'], opts['generator']] = [stack, generator]

    notice = @_buildNotice(opts)

    return false if @_checkHandlers(@beforeNotifyHandlers, notice)

    [currentError, currentNotice] = [error, notice]
    if ! @_loaded
      @log('Queuing notice', notice)
      @_queue.push(notice)
    else
      @log('Defering notice', notice)
      window.setTimeout () =>
        @_send(notice) if error == currentError

    return notice

  wrap: (func) ->
    honeybadgerWrapper = () ->
      try
        func.apply(this, arguments)
      catch e
        Honeybadger.notify(e)
        throw e

  reset: () ->
    @resetContext()
    @configuration.reset()
    @_configured = false
    @

  install: () ->
    return if @installed == true
    unless window.onerror == @_windowOnErrorHandler
      @log('Installing window.onerror handler')
      @_oldOnErrorHandler = window.onerror
      window.onerror = @_windowOnErrorHandler
    if @_loaded
      @log('honeybadger.js ' + @version + ' ready')
    else
      @log('Installing ready handler')
      if document.addEventListener
        document.addEventListener('DOMContentLoaded', @_domReady, true)
        window.addEventListener('load', @_domReady, true)
      else
        window.attachEvent('onload', @_domReady)
    @_installed = true
    @

  _queue: []

  _loaded: (document.readyState == 'complete')

  _configured: false

  _domReady: () =>
    return if @_loaded
    @_loaded = true
    @log('honeybadger.js ' + @version + ' ready')
    @_send(notice) while notice = @_queue.pop()

  _generateStackTrace: () ->
    try
      throw new Error('')
    catch e
      if stack = @_stackTrace(e)
        return [stack, 'throw']

    return []

  _stackTrace: (error) ->
    # From TraceKit: Opera 10 *destroys* its stacktrace property if you try to
    # access the stack property first!!
    error?.stacktrace || error?.stack || null

  # Internal: Check result of handlers.
  #
  # handlers - The Array handlers to be checked.
  # notice   - The Notice to be passed to handlers.
  #
  # Returns false if any of the handlers return false, otherwise true.
  _checkHandlers: (handlers, notice) ->
    (if handler(notice) == false then return true) for handler in handlers
    false

  # Internal: Build a Notice from user-defined options Object.
  #
  # opts - The Object containing options to pass to Notice.
  #
  # Returns built Notice.
  _buildNotice: (opts) ->
    new Notice({
      stack: opts['stack'],
      generator: opts['generator'],
      message: opts['message'],
      name: opts['name'],
      fingerprint: opts['fingerprint'],
      context: opts['context'],
      component: opts['component'],
      action: opts['action']
    }, @configuration)

  _send: (notice) ->
    @log('Sending notice', notice)
    [currentError, currentNotice] = [null, null]
    @_sendRequest(notice.payload())

  _validConfig: () ->
    return false unless @_configured
    if @configuration.api_key?.match(/\S/) then true else false

  # Internal: Constructs the base URL from configuration.
  _baseURL: () ->
    'http' + ((@configuration.ssl && 's') || '' ) + '://' + @configuration.host

  _sendRequest: (data) ->
    @_xhrRequest(data) || @_imageRequest(data)

  _imageRequest: (data) ->
    endpoint = @_baseURL() + '/v1/notices/js.gif'
    url = endpoint + '?' + @_serialize(api_key: @configuration.api_key, notice: data, t: new Date().getTime())
    [img, timeout] = [new Image(), null]
    img.onabort = img.onerror = =>
      window.clearTimeout(timeout) if timeout
      @log('Request failed.', url, data)
    img.onload = =>
      window.clearTimeout(timeout) if timeout
    img.src = url
    if @configuration.timeout
      timeout = window.setTimeout((() =>
        img.src = ''
        @log('Request timed out.', url, data)
      ), @configuration.timeout)
    true

  _xhrRequest: (data) ->
    return false if typeof XMLHttpRequest is 'undefined'
    return false if typeof JSON is 'undefined'

    method = 'POST'
    url = @_baseURL() + '/v1/notices/js?api_key=' + @configuration.api_key

    xhr = new XMLHttpRequest()
    if 'withCredentials' of xhr
      # Check if the XMLHttpRequest object has a "withCredentials" property.
      # "withCredentials" only exists on XMLHTTPRequest2 objects.
      xhr.open(method, url, true)
      xhr.setRequestHeader('Content-Type', 'application/json')
      xhr.setRequestHeader('X-Api-Key', @configuration.api_key)
    else unless typeof XDomainRequest is 'undefined'
      # Otherwise, check if XDomainRequest.
      # XDomainRequest only exists in IE, and is IE's way of making CORS requests.
      xhr = new XDomainRequest()
      xhr.open(method, url)
    else
      # Otherwise, CORS is not supported by the browser.
      xhr = null

    if xhr
      # These instructions are common to both XMLHttpRequest and XDomainRequest.
      xhr.timeout = @configuration.timeout if @configuration.timeout
      xhr.onerror = () =>
        @log('Request failed.', data, xhr)
      xhr.ontimeout = () =>
        @log('Request timed out.', data, xhr)
      xhr.onreadystatechange = () =>
        if xhr.readyState == 4
          if xhr.status == 201
            @log('Request succeeded.', xhr.status, data, xhr)
          else
            @log('Request rejected by server.', xhr.status, data, xhr)
      xhr.send(JSON.stringify(data))
      return true

    false

  _serialize: (obj, prefix) ->
    ret = []
    for k,v of obj
      if obj.hasOwnProperty(k) and k? and v?
        pk = (if prefix then prefix + '[' + k + ']' else k)
        ret.push(if typeof v is 'object' then @_serialize(v, pk) else encodeURIComponent(pk) + '=' + encodeURIComponent(v))
    ret.join '&'

  _windowOnErrorHandler: (msg, url, line, col, error) =>
    if !currentNotice && @configuration.onerror
      @log('Error caught by window.onerror', msg, url, line, col, error)
      unless error
        error = new UncaughtError(msg, url, line, col)
      @notify(error)
    if @_oldOnErrorHandler
      return @_oldOnErrorHandler.apply(this, arguments)
    false

# Invoked from window.onerror handler, and uses v8 stack format.
class UncaughtError extends Error
  constructor: (message, url, line, column) ->
    @name = 'window.onerror'
    @message = message || 'An unknown error was caught by window.onerror.'
    @stack = [
      @message
      '\n    at ? ('
      (url || 'unknown')
      ':'
      (line || 0)
      ':'
      (column || 0)
      ')'
    ].join('')

Honeybadger = new Client
Honeybadger.Client = Client

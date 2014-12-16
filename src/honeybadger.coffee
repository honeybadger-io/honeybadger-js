[currentError, currentNotice] = [null, null]

class Client
  version: '0.2.0-alpha'

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

  notify: (error, name, options = {}) ->
    return false if !@_validConfig() || @configuration.disabled == true

    if name instanceof Object
      options = name
      name = undefined
    else if name?
      options['name'] = name

    if error instanceof Error
      options['error'] = error
    else if typeof(error) == 'string'
      options['error'] = new Error(error)
    else if error instanceof Object
      for k,v of error
        options[k] = v

    if currentNotice
      if options.error == currentError
        return # Already caught by inner catch block, ignore.
      else if @_loaded # otherwise it's already in the queue
        # Report old error immediately since this is a new error.
        @_send(currentNotice)

    return false if (k for own k of options).length == 0
    notice = new Notice(options)
    (if handler(notice) == false then return false) for handler in @beforeNotifyHandlers

    [currentError, currentNotice] = [options.error, notice]

    if ! @_loaded
      @log('Queuing notice', notice)
      @_queue.push(notice)
    else
      @log('Defering notice', notice)
      window.setTimeout () =>
        @_send(notice) if options.error == currentError
    notice

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

  _send: (notice) ->
    @log('Sending notice', notice)
    [currentError, currentNotice] = [null, null]
    @_sendRequest(notice.payload())

  _validConfig: () ->
    return false unless @_configured
    if @configuration.api_key?.match(/\S/) then true else false

  _sendRequest: (data) ->
    url = 'http' + ((@configuration.ssl && 's') || '' ) + '://' + @configuration.host + '/v1/notices.gif'
    @_request(url, data)

  _request: (url, payload) ->
    [img, timeout] = [new Image(), null]
    img.onabort = img.onerror = =>
      window.clearTimeout(timeout) if timeout
      @log('Request failed.', url, payload)
    img.onload = =>
      window.clearTimeout(timeout) if timeout
    img.src = url + '?' + @_serialize(api_key: @configuration.api_key, notice: payload, t: new Date().getTime())
    if @configuration.timeout
      timeout = window.setTimeout((() =>
        img.src = ''
        @log('Request timed out.', url, payload)
      ), @configuration.timeout)
    true

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
    @name = 'UncaughtError'
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

Honeybadger =
  version: '0.0.3'

  TraceKit: TraceKit.noConflict()

  configured: false

  # TODO: Test partial override
  configure: (options = {}) ->
   if @configured == false
     options['disabled'] = false if typeof options.disabled == 'undefined'
     @configured = true
   for k,v of options
     @configuration[k] = v
   @TraceKit.collectWindowErrors = @configuration.onerror
   @

  configuration: new Configuration()

  context: {}

  resetContext: (options = {}) ->
   @context = if typeof(options) == 'object' then options else {}
   @

  setContext: (options = {}) ->
   if typeof(options) == 'object'
     for k,v of options
       @context[k] = v
   @

  beforeNotifyHandlers: []
  beforeNotify: (handler) ->
    @beforeNotifyHandlers.push handler

  # TODO: Test setting options from notify
  notify: (error, options = {}) ->
   return false if !@configured || @configuration.disabled == true
   options['error'] = error if error
   return false if (k for own k of options).length == 0
   notice = new Notice(options)
   (if handler(notice) == false then return false) for handler in @beforeNotifyHandlers
   @_sendRequest(notice.toJSON())

  reset: () ->
    @resetContext()
    @configuration.reset()
    @TraceKit.collectWindowErrors = @configuration.onerror
    @configured = false
    @

  install: () ->
    @TraceKit.collectWindowErrors = @configuration.onerror
    @TraceKit.report.subscribe @_handleTraceKitSubscription
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

  _handleTraceKitSubscription: (stackInfo) ->
    Honeybadger.notify(null, { stackInfo: stackInfo })

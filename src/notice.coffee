class Honeybadger.Notice
  constructor: (@options = {}) ->
    @error = @options.error
    @trace = if @error then @_parseBacktrace(printStackTrace({e: @error})) else null
    @class = @error?.name
    @message = @error?.message
    @url = document.URL
    @project_root = Honeybadger.configuration.project_root
    @environment = Honeybadger.configuration.environment
    @component = Honeybadger.configuration.component
    @action = Honeybadger.configuration.action

    @context = {}
    for k,v of Honeybadger.context
      @context[k] = v
    if @options.context
      for k,v of @options.context
        @context[k] = v

  toJSON: ->
    JSON.stringify
      notifier:
        name: 'honeybadger.js'
        url: 'https://github.com/honeybadger-io/honeybadger-js'
        version: Honeybadger.version
      error:
        class: @class
        message: @message
        backtrace: @trace
      request:
        url: @url
        component: @component
        action: @action
        context: @context
      server:
        project_root: @project_root
        environment_name: @environment

  _parseBacktrace: (lines) ->
    backtrace = []
    for line in lines
      [method, file, number] = @_parseBacktraceLine(line)
      backtrace.push
        file: file.replace(Honeybadger.configuration.project_root, '[PROJECT_ROOT]'),
        number: number,
        method: method
    backtrace

  _parseBacktraceLine: (line) ->
    line = line.replace(' (', '@(')
    line += '@unsupported.js:0' if line.indexOf('@') == -1
    match = line.match(/^(.*)@\(?(.*):(\d+)(?:\:\d+)\)?.*$/) || line.match(/^(.*)@(.*):(\d+)$/)
    if match then match[1..3] else null

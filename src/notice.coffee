Honeybadger.Notice = class Notice
  constructor: (@options = {}) ->
    @error = @options.error
    @trace = if @error then printStackTrace({e: @error}) else null
    @class = @error?.name
    @message = @error?.message
    @url = document.URL
    @project_root = Honeybadger.configuration.project_root
    @environment = Honeybadger.configuration.environment
    @component = Honeybadger.configuration.component
    @action = Honeybadger.configuration.action
    console.log @toJSON()

  toJSON: ->
    JSON.stringify
      notifier:
        name: 'honeybadger.js'
        url: 'https://github.com/honeybadger-io/honeybadger-js'
        version: '0.0.1'
      error:
        class: @class
        message: @message
        backtrace: @trace
      request:
        url: @url
        component: @component
        action: @action
      server:
        project_root: @project_root
        environment_name: @environment

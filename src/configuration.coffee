Honeybadger.Configuration = class Configuration
  api_key: null
  host: 'api.honeybadger.io'
  ssl: true
  project_root: window.location.protocol + '//' + window.location.host
  environment: 'production'
  component: null
  action: null

  # TODO: Test overriding all values via options object
  constructor: (@options = {}) ->
    this.api_key = @options.api_key || @api_key
    this.host = @options.host || @host
    this.ssl = if @options.ssl == undefined then @ssl else @options.ssl
    this.project_root = @options.project_root || @project_root
    this.environment = @options.environment || @environment
    this.component = @options.component || @component
    this.component = @options.component || @component

Honeybadger.configuration = new Configuration

Honeybadger.Configuration = class Configuration
  api_key: null
  host: 'api.honeybadger.io'
  ssl: true

  constructor: (@options = {}) ->
    this.api_key = @options.api_key || @api_key
    this.host = @options.api_key || @host
    this.ssl = @options.ssl || @ssl

Honeybadger.configuration = new Configuration

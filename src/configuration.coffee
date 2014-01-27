class Configuration
  @defaults:
     api_key: null
     host: 'api.honeybadger.io'
     ssl: true
     project_root: window.location.protocol + '//' + window.location.host
     environment: 'production'
     component: null
     action: null
     disabled: true
     onerror: false

  constructor: (options = {}) ->
    for k,v of @constructor.defaults
      @[k] = v
    for k,v of options
      @[k] = v

  reset: ->
   for k,v of @constructor.defaults
     @[k] = v
   @

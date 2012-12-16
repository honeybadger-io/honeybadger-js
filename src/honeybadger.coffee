window.Honeybadger = class Honeybadger
  @version: '0.0.1'

  @configuration:
    api_key: null
    host: 'api.honeybadger.io'
    ssl: true
    project_root: window.location.protocol + '//' + window.location.host
    environment: 'production'
    component: null
    action: null

  @configure: (options = {}) ->
    for k,v of options
      @configuration[k] = v

  @notify: (error) ->
    notice = new this.Notice
      error: error
    @sendRequest(notice.toJSON())

  # http://www.w3.org/TR/cors/
  @sendRequest: (data) ->
    request = new XMLHttpRequest()
    url = 'http' + ((@configuration.ssl && 's') || '' ) + '://' + @configuration.host + '/v1/notices'
    request.open('POST', url, true)
    request.setRequestHeader('Content-Type', 'application/json')
    request.setRequestHeader('X-API-Key', @configuration.api_key)
    request.send((data))

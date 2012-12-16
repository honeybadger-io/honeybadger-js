window.Honeybadger = class Honeybadger
  @configure: (args = {}) ->
    @configuration = new @Configuration(args)

  @notify: (error) ->
    notice = new this.Notice
      error: error
    @sendRequest(notice.toJSON())

  @sendRequest: (data) ->
    # http://www.w3.org/TR/cors/
    request = new XMLHttpRequest()
    url = 'http' + ((@configuration.ssl && 's') || '' ) + '://' + @configuration.host + '/v1/notices'
    request.open('POST', url, true)
    request.setRequestHeader('Content-Type', 'application/json')
    request.setRequestHeader('X-API-Key', @configuration.api_key)
    request.send((data))

window.Honeybadger = class Honeybadger
  @configure: (args = {}) ->
    @configuration = new @Configuration(args)

  @notify: (error) ->
    trace = printStackTrace({e: error})
    console.log trace

import url from 'url'
import domain from 'domain'

function fullUrl(req) {
  const connection = req.connection
  const address = connection && connection.address()
  const port = address ? address.port : undefined

  return url.format({
    protocol: req.protocol,
    hostname: req.hostname,
    port: port,
    pathname: req.path,
    query: req.query
  })
}

function requestHandler(req, res, next) {
  this.clear()
  const dom = domain.create()
  dom.on('error', next)
  dom.run(next)
}

function errorHandler(err, req, _res, next) {
  this.notify(err, {
    url:     fullUrl(req),
    params:  req.body,    // http://expressjs.com/en/api.html#req.body
    session: req.session, // https://github.com/expressjs/session#reqsession
    headers: req.headers, // https://nodejs.org/api/http.html#http_message_headers
    cgiData: {
      REQUEST_METHOD: req.method
    }
  })
  return next(err)
}

function lambdaHandler(handler) {
  return function lambdaHandler(event, context, callback) {
    // eslint-disable-next-line prefer-rest-params
    const args = arguments
    const dom = domain.create()
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const hb = this

    dom.on('error', function(err) {
      hb.notify(err, {
        afterNotify: function() {
          hb.clear()
          callback(err)
        }
      })
    })

    dom.run(function() {
      process.nextTick(function() {
        Promise.resolve(handler.apply(this, args))
          .then(() => { hb.clear() })
          .catch(function(err) {
            hb.notify(err, {
              afterNotify: function() {
                hb.clear()
                callback(err)
              }
            })
          })
      })
    })
  }.bind(this)
}

export {
  errorHandler,
  requestHandler,
  lambdaHandler
}

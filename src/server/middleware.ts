import url from 'url'
import domain from 'domain'
import { NextFunction, Request, Response } from 'express'
import { Noticeable } from '../core/types';

function fullUrl(req: Request): string {
  const connection = req.connection
  const address = connection && connection.address()
  // @ts-ignore The old @types/node incorrectly defines `address` as string|Address
  const port = address ? address.port : undefined

  // @ts-ignore
  return url.format({
    protocol: req.protocol,
    hostname: req.hostname,
    port: port,
    pathname: req.path,
    query: req.query
  })
}

function requestHandler(req: Request, res: Response, next: NextFunction): void {
  this.clear()
  const dom = domain.create()
  dom.on('error', next)
  dom.run(next)
}

function errorHandler(err: Noticeable, req: Request, _res: Response, next: NextFunction): unknown {
  this.notify(err, {
    url:     fullUrl(req),
    params:  req.body,    // http://expressjs.com/en/api.html#req.body
    // @ts-ignore
    session: req.session, // https://github.com/expressjs/session#reqsession
    headers: req.headers, // https://nodejs.org/api/http.html#http_message_headers
    cgiData: {
      REQUEST_METHOD: req.method
    }
  })
  return next(err)
}

type LambdaHandler = (event: unknown, context: unknown, callback: unknown) => void|Promise<unknown>

function lambdaHandler(handler: LambdaHandler): LambdaHandler {
  return function lambdaHandler(event, context, callback) {

    /**
     * in the case of an async handler, the length of the handler will be less than 3 (no callback function).
     * if this is the case, we have to explicitly call the callback function from the function we are returning.
     * we don't have to do that if the handler has third callback function parameter,
     * because it will be called directly from inside the handler.
     */
    const shouldInvokeCallbackExplicitly = handler.length < 3

    /**
     * this flag prevents an infinite loop in case of an error thrown
     * inside the domain error handler {@link hbHandler}
     */
    let domainErrorHandlerAlreadyCalled = false;

    // eslint-disable-next-line prefer-rest-params
    const args = arguments
    const dom = domain.create()
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const hb = this

    const hbHandler = function (err?: Error) {
      if (domainErrorHandlerAlreadyCalled) {
         return
      }
      domainErrorHandlerAlreadyCalled = true
      hb.notify(err, {
        afterNotify: function() {
          hb.clear()
          callback(err)
        }
      })
    }

    dom.on('error', hbHandler)

    dom.run(function() {
      process.nextTick(function() {
        Promise.resolve(handler.apply(this, args))
          .then((res?) => {
            hb.clear()
            if (shouldInvokeCallbackExplicitly) {
              callback(null, res)
            }
          })
          .catch(hbHandler)
      })
    })
  }.bind(this)
}

export {
  errorHandler,
  requestHandler,
  lambdaHandler
}

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

export function requestHandler(req: Request, res: Response, next: NextFunction): void {
  this.clear()
  const dom = domain.create()
  dom.on('error', next)
  dom.run(next)
}

export function errorHandler(err: Noticeable, req: Request, _res: Response, next: NextFunction): unknown {
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

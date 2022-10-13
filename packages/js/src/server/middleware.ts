import url from 'node:url'
import http from 'node:http'
import { Types } from '@honeybadger-io/core'

type ExpressNextFunction = (err?: unknown) => unknown
interface ExpressRequest extends http.IncomingMessage {
  body: unknown;
  query: unknown;
  protocol: string;
  path: string;
  hostname: string;
  [x: string]: unknown;
}
interface ExpressResponse extends http.ServerResponse {
  [x: string]: unknown;
}

function fullUrl(req: ExpressRequest): string {
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

export function requestHandler(req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction): void {
  this.withRequest(req, next, next)
}

export function errorHandler(err: Types.Noticeable, req: ExpressRequest, _res: ExpressResponse, next: ExpressNextFunction): unknown {
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
  if (next) {
    return next(err)
  }
}

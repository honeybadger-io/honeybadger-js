import url from 'url'
import { NextFunction, Request, Response } from 'express'
import { Client, Types, Util } from '@honeybadger-io/core'
import {
  buildRequestEventPayload,
  durationMs,
  seedRequestEventContext,
  startTimer,
} from './instrumentation/http_event'

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

function instrumentInboundRequest(client: Client, req: Request, res: Response): void {
  const start = startTimer()
  let emitted = false
  const emit = () => {
    if (emitted) return
    emitted = true
    client.event('request.handled', buildRequestEventPayload({
      method: req.method,
      path: req.path,
      route: req.route?.path,
      status: res.statusCode,
      duration: durationMs(start),
    }))
  }
  res.once('finish', emit)
  res.once('close', emit)
}

export function requestHandler(req: Request, res: Response, next: NextFunction): void {
  this.withRequest(req, () => {
    this.setEventContext(seedRequestEventContext(req.headers as Record<string, string | string[] | undefined>))

    if (Util.resolveInsights(this.config).http) {
      instrumentInboundRequest(this, req, res)
    }

    next()
  }, next)
}

export function errorHandler(err: Types.Noticeable, req: Request, _res: Response, next: NextFunction): unknown {
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

import Client from './core/client'
import { Config, Notice, BeforeNotifyHandler } from './core/types'
import { merge, sanitize, filter, runAfterNotifyHandlers, objectIsExtensible, endpoint } from './core/util'
import { encodeCookie, decodeCookie, preferCatch } from './browser/util'
import { onError, ignoreNextOnError } from './browser/integrations/onerror'
import onUnhandledRejection from './browser/integrations/onunhandledrejection'
import breadcrumbs from './browser/integrations/breadcrumbs'
import timers from './browser/integrations/timers'
import eventListeners from './browser/integrations/event_listeners'

interface BrowserConfig extends Config {
  async: boolean
  maxErrors: number
}

interface WrappedFunc {
  (): (...args: unknown[]) => unknown
  ___hb: WrappedFunc
}

class Honeybadger extends Client {
  /** @internal */
  private __errorsSent = 0
  /** @internal */
  private __lastWrapErr = undefined

  config: BrowserConfig

  /** @internal */
  protected __beforeNotifyHandlers: BeforeNotifyHandler[] = [
    (notice: Notice) => {
      if (this.__exceedsMaxErrors()) {
        this.logger.debug('Dropping notice: max errors exceeded', notice)
        return false
      }

      if (!notice.url) { notice.url = document.URL }

      return true
    }
  ]

  constructor(opts: Partial<BrowserConfig> = {}) {
    super({
      async: true,
      maxErrors: null,
      projectRoot: window.location.protocol + '//' + window.location.host,
      ...opts
    })
  }

  configure(opts: Partial<BrowserConfig> = {}) {
    return super.configure(opts)
  }

  resetMaxErrors(): number {
    return (this.__errorsSent = 0)
  }

  factory(opts?: Partial<BrowserConfig>): Honeybadger {
    return new Honeybadger(opts)
  }

  /** @internal */
  protected __buildPayload(notice:Notice): Record<string, Record<string, unknown>> {
    const cgiData = {
      HTTP_USER_AGENT: undefined,
      HTTP_REFERER: undefined,
      HTTP_COOKIE: undefined
    }

    cgiData.HTTP_USER_AGENT = navigator.userAgent
    if (document.referrer.match(/\S/)) {
      cgiData.HTTP_REFERER = document.referrer
    }

    let cookiesObject: Record<string, unknown>
    if (typeof notice.cookies === 'string') {
      cookiesObject = decodeCookie(notice.cookies)
    } else {
      cookiesObject = notice.cookies
    }
    if (cookiesObject) {
      cgiData.HTTP_COOKIE = encodeCookie(filter(cookiesObject, this.config.filters))
    }

    const payload = super.__buildPayload(notice)
    payload.request.cgi_data = merge(cgiData, payload.request.cgi_data as Record<string, unknown>)

    return payload
  }

  /** @internal */
  protected __send(notice): void {
    this.__incrementErrorsCount()

    const payload = this.__buildPayload(notice)
    const handlers = Array.prototype.slice.call(this.__afterNotifyHandlers)
    if (notice.afterNotify) { handlers.unshift(notice.afterNotify) }

    try {
      const x = new XMLHttpRequest()
      x.open('POST', endpoint(this.config, '/v1/notices/js'), this.config.async)

      x.setRequestHeader('X-API-Key', this.config.apiKey)
      x.setRequestHeader('Content-Type', 'application/json')
      x.setRequestHeader('Accept', 'text/json, application/json')

      x.send(JSON.stringify(sanitize(payload, this.config.maxObjectDepth)))
      x.onload = () => {
        if (x.status !== 201) {
          runAfterNotifyHandlers(notice, handlers, new Error(`Bad HTTP response: ${x.status}`))
          this.logger.debug(`Unable to send error report: ${x.status}: ${x.statusText}`, x, notice)
          return
        }
        runAfterNotifyHandlers(merge(notice, {
          id: JSON.parse(x.response).id
        }), handlers)
        this.logger.debug('Error report sent', notice)
      }
    } catch (err) {
      runAfterNotifyHandlers(notice, handlers, err)
      this.logger.error('Unable to send error report: error while initializing request', err, notice)
    }
  }

  /**
   * wrap always returns the same function so that callbacks can be removed via
   * removeEventListener.
   * @internal
   */
  __wrap(f:unknown, opts:Record<string, unknown> = {}):WrappedFunc {
    const func = f as WrappedFunc
    if (!opts) { opts = {} }
    try {
      if (typeof func !== 'function') { return func }
      if (!objectIsExtensible(func)) { return func }
      if (!func.___hb) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const client = this
        func.___hb = <WrappedFunc>function () {
          const onErrorEnabled = client.config.enableUncaught
          // Catch if:
          //   1. We explicitly want to catch (i.e. if the error could be
          //      caught before reaching window.onerror)
          //   2. The browser provides less information via the window.onerror
          //      handler
          //   3. The window.onerror handler is unavailable
          if (opts.catch || preferCatch || !onErrorEnabled) {
            try {
              // eslint-disable-next-line prefer-rest-params
              return func.apply(this, arguments)
            } catch (err) {
              if (client.__lastWrapErr === err) { throw (err) }
              client.__lastWrapErr = err
              ignoreNextOnError()
              client.addBreadcrumb(
                opts.component ? `${opts.component}: ${err.name}` : err.name,
                {
                  category: 'error',
                  metadata: {
                    message: err.message,
                    name: err.name,
                    stack: err.stack
                  }
                }
              )
              client.notify(err)
              throw (err)
            }
          } else {
            // eslint-disable-next-line prefer-rest-params
            return func.apply(this, arguments)
          }
        }
      }
      func.___hb.___hb = func.___hb
      return func.___hb
    } catch (_e) {
      return func
    }
  }

  /** @internal */
  private __incrementErrorsCount(): number {
    return this.__errorsSent++
  }

  /** @internal */
  private __exceedsMaxErrors(): boolean {
    return this.config.maxErrors && this.__errorsSent >= this.config.maxErrors
  }
}

export default new Honeybadger({
  __plugins: [
    onError(),
    onUnhandledRejection(),
    timers(),
    eventListeners(),
    breadcrumbs()
  ]
})

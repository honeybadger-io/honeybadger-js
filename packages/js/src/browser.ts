import { Types, Util, Client } from '@honeybadger-io/core'
import { encodeCookie, decodeCookie, preferCatch } from './browser/util'
import { onError, ignoreNextOnError } from './browser/integrations/onerror'
import onUnhandledRejection from './browser/integrations/onunhandledrejection'
import breadcrumbs from './browser/integrations/breadcrumbs'
import timers from './browser/integrations/timers'
import eventListeners from './browser/integrations/event_listeners'
import { BrowserTransport } from './browser/transport';

const { merge, filter, objectIsExtensible } = Util

interface WrappedFunc {
  (): (...args: unknown[]) => unknown
  ___hb: WrappedFunc
}

class Honeybadger extends Client {
  /** @internal */
  private __errorsSent = 0
  /** @internal */
  private __lastWrapErr = undefined

  config: Types.BrowserConfig

  /** @internal */
  protected __beforeNotifyHandlers: Types.BeforeNotifyHandler[] = [
    (notice?: Types.Notice) => {
      if (this.__exceedsMaxErrors()) {
        this.logger.debug('Dropping notice: max errors exceeded', notice)
        return false
      }

      if (notice && !notice.url) { notice.url = document.URL }

      this.__incrementErrorsCount()

      return true
    }
  ]

  constructor(opts: Partial<Types.BrowserConfig> = {}) {
    super({
      async: true,
      maxErrors: null,
      projectRoot: window.location.protocol + '//' + window.location.host,
      ...opts
    }, new BrowserTransport())
  }

  configure(opts: Partial<Types.BrowserConfig> = {}): this {
    return super.configure(opts)
  }

  resetMaxErrors(): number {
    return (this.__errorsSent = 0)
  }

  public factory(opts?: Partial<Types.BrowserConfig>): this {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Honeybadger(opts) as any
  }

  public checkIn(_id: string): Promise<void> {
    throw new Error('Honeybadger.checkIn() is not supported on the browser')
  }

  /** @internal */
  protected __buildPayload(notice: Types.Notice): Types.NoticeTransportPayload {
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
          if (preferCatch) {
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
              if (client.config.enableUncaught) {
                client.notify(err)
              }
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

export { Types } from '@honeybadger-io/core'

export default new Honeybadger({
  __plugins: [
    onError(),
    onUnhandledRejection(),
    timers(),
    eventListeners(),
    breadcrumbs()
  ]
})

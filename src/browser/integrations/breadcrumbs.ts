/* eslint-disable prefer-rest-params */
import { sanitize, instrument } from '../../core/util'
import { Plugin } from '../../core/types'
import Client from '../../browser'
import { stringNameOfElement, stringSelectorOfElement, stringTextOfElement, localURLPathname, nativeFetch } from '../util'

export default function (_window = window): Plugin {
  return {
    load: (client: typeof Client) => {
      function breadcrumbsEnabled(type) {
        if (client.config.breadcrumbsEnabled === true) { return true} 
        if (type) { return client.config.breadcrumbsEnabled[type] === true} 
        return client.config.breadcrumbsEnabled !== false
      }

      // Breadcrumbs: instrument console
      (function () {
        if (!breadcrumbsEnabled('console')) { return} 

        function inspectArray(obj) {
          if (!Array.isArray(obj)) { return ''} 

          return obj.map(value => {
            try {
              return String(value)
            } catch (e) {
              return '[unknown]'
            }
          }).join(' ')
        }

        ['debug', 'info', 'warn', 'error', 'log'].forEach(level => {
          instrument(_window.console, level, function (original) {
            return function () {
              const args = Array.prototype.slice.call(arguments)
              const message = inspectArray(args)
              const opts = {
                category: 'log',
                metadata: {
                  level: level,
                  arguments: sanitize(args, 3)
                }
              }

              client.addBreadcrumb(message, opts)

              if (typeof original === 'function') {
                Function.prototype.apply.call(original, _window.console, arguments)
              }
            }
          })
        })
      })();

      // Breadcrumbs: instrument click events
      (function () {
        if (!breadcrumbsEnabled('dom')) { return} 

        _window.addEventListener('click', (event) => {
          let message, selector, text
          try {
            message = stringNameOfElement(event.target)
            selector = stringSelectorOfElement(event.target)
            text = stringTextOfElement(event.target)
          } catch (e) {
            message = 'UI Click'
            selector = '[unknown]'
            text = '[unknown]'
          }

          // There's nothing to display
          if (message.length === 0) { return} 

          client.addBreadcrumb(message, {
            category: 'ui.click',
            metadata: {
              selector,
              text,
              event
            }
          })
        }, true)
      })();

      // Breadcrumbs: instrument XMLHttpRequest
      (function () {
        if (!breadcrumbsEnabled('network')) { return} 

        // -- On xhr.open: capture initial metadata
        instrument(XMLHttpRequest.prototype, 'open', function (original) {
          return function () {
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            const xhr = this
            const url = arguments[1]
            const method = typeof arguments[0] === 'string' ? arguments[0].toUpperCase() : arguments[0]
            const message = `${method} ${localURLPathname(url)}`

            this.__hb_xhr = {
              type: 'xhr',
              method,
              url,
              message
            }

            if (typeof original === 'function') {
              original.apply(xhr, arguments)
            }
          }
        })

        // -- On xhr.send: set up xhr.onreadystatechange to report breadcrumb
        instrument(XMLHttpRequest.prototype, 'send', function (original) {
          return function () {
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            const xhr = this

            function onreadystatechangeHandler() {
              if (xhr.readyState === 4) {
                let message

                if (xhr.__hb_xhr) {
                  xhr.__hb_xhr.status_code = xhr.status
                  message = xhr.__hb_xhr.message
                  delete xhr.__hb_xhr.message
                }

                client.addBreadcrumb(message || 'XMLHttpRequest', {
                  category: 'request',
                  metadata: xhr.__hb_xhr
                })
              }
            }

            if ('onreadystatechange' in xhr && typeof xhr.onreadystatechange === 'function') {
              instrument(xhr, 'onreadystatechange', function (original) {
                return function () {
                  onreadystatechangeHandler()

                  if (typeof original === 'function') {
                    // eslint-disable-next-line prefer-rest-params
                    original.apply(this, arguments)
                  }
                }
              })
            } else {
              xhr.onreadystatechange = onreadystatechangeHandler
            }

            if (typeof original === 'function') {
              // eslint-disable-next-line prefer-rest-params
              original.apply(xhr, arguments)
            }
          }
        })
      })();

      // Breadcrumbs: instrument fetch
      (function () {
        if (!breadcrumbsEnabled('network')) { return} 

        if (!nativeFetch()) {
          // Polyfills use XHR.
          return
        }

        instrument(_window, 'fetch', function (original) {
          return function () {
            // eslint-disable-next-line prefer-rest-params
            const input = arguments[0]

            let method = 'GET'
            let url

            if (typeof input === 'string') {
              url = input
            } else if ('Request' in _window && input instanceof Request) {
              url = input.url
              if (input.method) {
                method = input.method
              }
            } else {
              url = String(input)
            }

            if (arguments[1] && arguments[1].method) {
              method = arguments[1].method
            }

            if (typeof method === 'string') {
              method = method.toUpperCase()
            }

            const message = `${method} ${localURLPathname(url)}`
            const metadata = {
              type: 'fetch',
              method,
              url
            }

            return original
              .apply(this, arguments)
              .then(function (response) {
                metadata['status_code'] = response.status
                client.addBreadcrumb(message, {
                  category: 'request',
                  metadata
                })
                return response
              })
              .catch(function (error) {
                client.addBreadcrumb('fetch error', {
                  category: 'error',
                  metadata
                })

                throw error
              })
          }
        })
      })();

      // Breadcrumbs: instrument navigation
      (function () {
        if (!breadcrumbsEnabled('navigation')) { return} 

        // The last known href of the current page
        let lastHref = _window.location.href

        function recordUrlChange(from, to) {
          lastHref = to
          client.addBreadcrumb('Page changed', {
            category: 'navigation',
            metadata: {
              from,
              to
            }
          })
        }

        // https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onpopstate
        instrument(_window, 'onpopstate', function (original) {
          return function () {
            recordUrlChange(lastHref, _window.location.href)
            if (original) {
              return original.apply(this, arguments)
            }
          }
        })

        // https://developer.mozilla.org/en-US/docs/Web/API/History/pushState
        // https://developer.mozilla.org/en-US/docs/Web/API/History/replaceState
        function historyWrapper(original) {
          return function () {
            const url = arguments.length > 2 ? arguments[2] : undefined
            if (url) {
              recordUrlChange(lastHref, String(url))
            }
            return original.apply(this, arguments)
          }
        }
        instrument(_window.history, 'pushState', historyWrapper)
        instrument(_window.history, 'replaceState', historyWrapper)
      })()
    }
  }
}

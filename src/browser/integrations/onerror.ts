/* eslint-disable prefer-rest-params */
import { makeNotice, instrument } from '../../../src/core/util'
import { Plugin } from '../../core/types'
import Client from '../../browser'

let ignoreOnError = 0
let currentTimeout

export function ignoreNextOnError(): void {
  ignoreOnError += 1
  clearTimeout(currentTimeout)
  currentTimeout = setTimeout(() => {
    ignoreOnError = 0
  })
}

export function onError(_window: any = window): Plugin {
  return {
    load: (client: typeof Client) => {
      if (typeof client.config.onerror === 'undefined') { client.config.onerror = true }

      instrument(_window, 'onerror', function (original) {
        const onerror = function (msg, url, line, col, err) {
          client.config.logger.debug('window.onerror callback invoked', arguments)

          if (ignoreOnError > 0) {
            client.config.logger.debug('Ignoring window.onerror (error likely reported earlier)', arguments)
            ignoreOnError -= 1
            return
          }

          if (!client.config.onerror) { return }

          if (line === 0 && /Script error\.?/.test(msg)) {
            // See https://developer.mozilla.org/en/docs/Web/API/GlobalEventHandlers/onerror#Notes
            client.config.logger.info('Ignoring cross-domain script error: enable CORS to track these types of errors', arguments)
            return
          }

          const notice = makeNotice(err)
          if (!notice.name) { notice.name = 'window.onerror' }
          if (!notice.message) { notice.message = msg }
          if (!notice.stack) {
            // Simulate v8 stack
            notice.stack = [notice.message, '\n    at ? (', url || 'unknown', ':', line || 0, ':', col || 0, ')'].join('')
          }

          client.addBreadcrumb(
            (notice.name === 'window.onerror' || !notice.name) ? 'window.onerror' : `window.onerror: ${notice.name}`,
            {
              category: 'error',
              metadata: {
                name: notice.name,
                message: notice.message,
                stack: notice.stack
              }
            }
          )

          client.notify(notice)
        }

        return function (msg, url, line, col, err) {
          onerror(msg, url, line, col, err)
          if (typeof original === 'function') {
            return original.apply(window, arguments)
          }
          return false
        }
      })
    }
  }
}

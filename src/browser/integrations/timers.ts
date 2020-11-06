/* eslint-disable prefer-rest-params */
import { instrument } from '../../core/util'
import { Plugin } from '../../core/types'
import Client from '../../browser'

export default function (_window = window): Plugin {
  return {
    load: (client: typeof Client) => {
      // Wrap timers
      (function () {
        function instrumentTimer(wrapOpts) {
          return function (original) {
            // See https://developer.mozilla.org/en-US/docs/Web/API/WindowTimers/setTimeout
            return function (func, delay) {
              if (typeof func === 'function') {
                const args = Array.prototype.slice.call(arguments, 2)
                func = client.__wrap(func, wrapOpts)
                return original(function () {
                  func(...args)
                }, delay)
              } else {
                return original(func, delay)
              }
            }
          }
        }
        instrument(_window, 'setTimeout', instrumentTimer({ component: 'setTimeout' }))
        instrument(_window, 'setInterval', instrumentTimer({ component: 'setInterval' }))
      })()
    }
  }
}

/* eslint-disable prefer-rest-params */
import { Types, Util } from '@honeybadger-io/core'
import Client from '../../browser'

const { instrument, makeNotice, globalThisOrWindow } = Util

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function (_window: any = globalThisOrWindow()): Types.Plugin {
  return {
    load: (client: typeof Client) => {
      if (!client.config.enableUnhandledRejection) { return }

      instrument(_window, 'onunhandledrejection', function (original) {
        // See https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event
        function onunhandledrejection(promiseRejectionEvent) {
          client.logger.debug('window.onunhandledrejection callback invoked', arguments)

          if (!client.config.enableUnhandledRejection) { return }

          const { reason } = promiseRejectionEvent

          if (reason instanceof Error) {
            const notice = makeNotice(reason)
            if (!notice.stack) {
              notice.stack = `${reason.message}\n    at ? (unknown:0)`
            }
            notice.message = `UnhandledPromiseRejectionWarning: ${reason}`
            client.addBreadcrumb(
              `window.onunhandledrejection: ${notice.name}`,
              {
                category: 'error',
                metadata: { name: notice.name, message: notice.message, stack: notice.stack }
              }
            )
            client.notify(notice)
            return
          }

          let message: string
          if (typeof reason === 'string') {
            message = reason
          } else {
            try {
              message = JSON.stringify(reason) ?? 'Unspecified reason'
            } catch (_err) {
              // Circular structures (e.g. DOM nodes with React fiber expandos) can't be stringified
              const name = reason != null && reason.constructor ? reason.constructor.name : null
              message = name ? `[${name}]` : Object.prototype.toString.call(reason)
            }
          }
          client.notify({
            name: 'window.onunhandledrejection',
            message: `UnhandledPromiseRejectionWarning: ${message}`
          })
        }

        return function (promiseRejectionEvent) {
          onunhandledrejection(promiseRejectionEvent)
          if (typeof original === 'function') {
            original.apply(this, arguments)
          }
        }
      })
    }
  }
}

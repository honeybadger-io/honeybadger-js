/* eslint-disable prefer-rest-params */
import { Types, Util } from '@honeybadger-io/core'
import Client from '../../browser'

const { instrument, globalThisOrWindow } = Util

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
            if (!reason.stack) {
              reason.stack = `${reason.message}\n    at ? (unknown:0)`
            }
            reason.message = `UnhandledPromiseRejectionWarning: ${reason.message}`
            client.addBreadcrumb(
              `window.onunhandledrejection: ${reason.name}`,
              {
                category: 'error',
                metadata: { name: reason.name, message: reason.message, stack: reason.stack }
              }
            )
            client.notify(reason)
            return
          }

          const message = typeof reason === 'string' ? reason : (JSON.stringify(reason) ?? 'Unspecified reason')
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

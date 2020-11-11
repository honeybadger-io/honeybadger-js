/* eslint-disable prefer-rest-params */
import { instrument } from '../../core/util'
import { Plugin } from '../../core/types'
import Client from '../../browser'

export default function (_window = window): Plugin {
  return {
    load: (client: typeof Client) => {
      if (typeof client.config.onunhandledrejection === 'undefined') { client.config.onunhandledrejection = true }

      instrument(_window, 'onunhandledrejection', function (original) {
        // See https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event
        function onunhandledrejection(promiseRejectionEvent) {
          client.logger.debug('window.onunhandledrejection callback invoked', arguments)

          if (!client.config.onunhandledrejection) { return }

          const { reason } = promiseRejectionEvent

          if (reason instanceof Error) {
            // simulate v8 stack
            // const fileName = reason.fileName || 'unknown'
            // const lineNumber = reason.lineNumber || 0
            const fileName = 'unknown'
            const lineNumber = 0
            const stackFallback = `${reason.message}\n    at ? (${fileName}:${lineNumber})`
            const stack = reason.stack || stackFallback
            const err = {
              name: reason.name,
              message: `UnhandledPromiseRejectionWarning: ${reason}`,
              stack
            }
            client.addBreadcrumb(
              `window.onunhandledrejection: ${err.name}`,
              {
                category: 'error',
                metadata: err
              }
            )
            client.notify(err)
            return
          }

          const message = typeof reason === 'string' ? reason : JSON.stringify(reason)
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

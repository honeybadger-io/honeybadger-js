import { instrument } from '../../core/util'
import { Plugin } from '../../core/types'
import Client from '../../browser'

export default function (_window = window): Plugin {
  return {
    load: (client: typeof Client) => {
      // Wrap event listeners
      // Event targets borrowed from bugsnag-js:
      // See https://github.com/bugsnag/bugsnag-js/blob/d55af916a4d3c7757f979d887f9533fe1a04cc93/src/bugsnag.js#L542
      const targets = ['EventTarget', 'Window', 'Node', 'ApplicationCache', 'AudioTrackList', 'ChannelMergerNode', 'CryptoOperation', 'EventSource', 'FileReader', 'HTMLUnknownElement', 'IDBDatabase', 'IDBRequest', 'IDBTransaction', 'KeyOperation', 'MediaController', 'MessagePort', 'ModalWindow', 'Notification', 'SVGElementInstance', 'Screen', 'TextTrack', 'TextTrackCue', 'TextTrackList', 'WebSocket', 'WebSocketWorker', 'Worker', 'XMLHttpRequest', 'XMLHttpRequestEventTarget', 'XMLHttpRequestUpload']
      targets.forEach(function (prop) {
        const prototype = _window[prop] && _window[prop].prototype
        if (prototype && Object.prototype.hasOwnProperty.call(prototype, 'addEventListener')) {
          instrument(prototype, 'addEventListener', function (original) {
            const wrapOpts = { component: `${prop}.prototype.addEventListener` }

            // See https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
            return function (type, listener, useCapture, wantsUntrusted) {
              try {
                if (listener && listener.handleEvent != null) {
                  listener.handleEvent = client.__wrap(listener.handleEvent, wrapOpts)
                }
              } catch (e) {
                // Ignore 'Permission denied to access property "handleEvent"' errors.
                client.config.logger.error(e)
              }
              return original.call(this, type, client.__wrap(listener, wrapOpts), useCapture, wantsUntrusted)
            }
          })
          instrument(prototype, 'removeEventListener', function (original) {
            return function (type, listener, useCapture, wantsUntrusted) {
              original.call(this, type, listener, useCapture, wantsUntrusted)
              return original.call(this, type, client.__wrap(listener), useCapture, wantsUntrusted)
            }
          })
        }
      })
    }
  }
}

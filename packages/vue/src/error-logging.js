import { generateComponentTrace } from './vue-debug'

export function logError (app, error, vm, info) {
  const message = `Error in ${info}: "${error && error.toString()}"`

  const trace = vm ? generateComponentTrace(vm) : ''
  if (app.config.warnHandler) {
    app.config.warnHandler.call(null, message, vm, trace)
  } else {
    console.error(`[Vue warn]: ${message}${trace}`)
  }
}

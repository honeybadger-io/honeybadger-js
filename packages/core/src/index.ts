import consoleEvents from './plugins/console_events'

export { Client } from './client'
export * from './store'
export * as Types from './types'
export * as Util from './util'
export * as Defaults from './defaults'

export const Plugins = {
  consoleEvents,
  /**
   * @deprecated Use `consoleEvents` instead. Kept as an alias for backwards
   * compatibility and will be removed in a future major version.
   */
  events: consoleEvents,
}

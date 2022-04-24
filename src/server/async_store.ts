import { BreadcrumbRecord, HoneybadgerStore } from '../core/types'

let Store: HoneybadgerStore<{ context: Record<string, unknown>; breadcrumbs: BreadcrumbRecord[]; }>
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { AsyncLocalStorage } = require('async_hooks')
  Store = new AsyncLocalStorage()
}
catch (e) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GlobalStore } = require('../core/store')
  Store = new GlobalStore()
}

export const AsyncStore = Store
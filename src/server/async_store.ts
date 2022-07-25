import { BreadcrumbRecord, HoneybadgerStore } from '../core/types'
import { GlobalStore } from '../core/store';

let Store: HoneybadgerStore<{ context: Record<string, unknown>; breadcrumbs: BreadcrumbRecord[]; }>
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { AsyncLocalStorage } = require('async_hooks')
  Store = new AsyncLocalStorage()
}
catch (e) {
  Store = GlobalStore
}

export const AsyncStore = Store

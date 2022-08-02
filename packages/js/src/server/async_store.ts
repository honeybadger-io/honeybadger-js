import { Types, Store as StoreModule } from '@honeybadger-io/core'

let Store: Types.HoneybadgerStore<{ context: Record<string, unknown>; breadcrumbs: Types.BreadcrumbRecord[]; }>
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { AsyncLocalStorage } = require('async_hooks')
  Store = new AsyncLocalStorage()
}
catch (e) {
  Store = new StoreModule.GlobalStore({ context: {}, breadcrumbs: [] })
}

export const AsyncStore = Store

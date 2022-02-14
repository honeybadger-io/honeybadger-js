import { AsyncLocalStorage } from 'async_hooks'
import { BreadcrumbRecord, HoneybadgerStore } from "../core/types"

export const AsyncStore: HoneybadgerStore = new AsyncLocalStorage<{ context: Record<string, unknown>; breadcrumbs: BreadcrumbRecord[] }>()
import { AsyncLocalStorage } from 'async_hooks'
import { BreadcrumbRecord } from "../core/types"

export const AsyncStore = new AsyncLocalStorage<{ context: Record<string, unknown>; breadcrumbs: BreadcrumbRecord[] }>()
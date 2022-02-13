import { AsyncLocalStorage } from 'async_hooks'
import { BreadcrumbRecord, HoneybadgerStore } from "../core/types"

export class AsyncStore implements HoneybadgerStore {

    private store: AsyncLocalStorage<{ context: Record<string, unknown>; breadcrumbs: BreadcrumbRecord[] }>;

    constructor(store: AsyncLocalStorage<{context: Record<string, unknown>; breadcrumbs: BreadcrumbRecord[]}>) {
        this.store = store
    }

    clear(): void {
        const store = this.store.getStore()
        store.breadcrumbs = []
        store.context = {}
    }

    getBreadcrumbs(): BreadcrumbRecord[] {
        const store = this.store.getStore()
        return store.breadcrumbs
    }

    getContext(): Record<string, unknown> {
        const store = this.store.getStore()
        return store.context
    }

    setBreadcrumbs(breadcrumbs: BreadcrumbRecord[]): void {
        const store = this.store.getStore()
        store.breadcrumbs = breadcrumbs
        store.context = {}
    }

    setContext(context: Record<string, unknown>): void {
        const store = this.store.getStore()
        store.context = context
    }
}
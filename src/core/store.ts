import { BreadcrumbRecord, HoneybadgerStore } from "./types";

export class DefaultStore implements HoneybadgerStore {
    private store: { context: Record<string, unknown>; breadcrumbs: BreadcrumbRecord[]; }

    constructor() {
        this.store = {
            context: {},
            breadcrumbs: []
        }
    }

    getStore(): { context: Record<string, unknown>; breadcrumbs: BreadcrumbRecord[] } {
        return this.store
    }
}
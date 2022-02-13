import { BreadcrumbRecord, HoneybadgerStore } from "./types";

export class DefaultStore implements HoneybadgerStore {
    private context: Record<string, unknown>
    private breadcrumbs: BreadcrumbRecord[]

    constructor() {
        this.clear()
    }

    clear(): void {
        this.context = {}
        this.breadcrumbs = []
    }

    getBreadcrumbs(): BreadcrumbRecord[] {
        return this.breadcrumbs
    }

    getContext(): Record<string, unknown> {
        return this.context
    }

    setBreadcrumbs(breadcrumbs: BreadcrumbRecord[]): void {
        this.breadcrumbs = breadcrumbs
    }

    setContext(context: Record<string, unknown>): void {
        this.context = context
    }

}
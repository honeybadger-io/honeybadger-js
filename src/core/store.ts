import { HoneybadgerStore } from "./types";

export class DefaultStore<T> implements HoneybadgerStore<T> {
    private store: T

    constructor(store: T) {
        this.store = store;
    }

    getStore(): T {
        return this.store
    }

    run(store: T, callback: (...args: never[]) => void, args: never): void {
        this.store = store
        callback(args)
    }
}
import { HoneybadgerStore } from "./types";

export class DefaultStore<T> implements HoneybadgerStore<T> {
    private store: T

    constructor(store: T) {
        this.store = store;
    }

    getStore(): T {
        return this.store
    }

    // eslint-disable @typescript-eslint/no-explicit-any
    run<R, TArgs extends any[]>(store: T, callback: (...args: TArgs) => R, ...args: TArgs): R {
        this.store = store;
        return callback(...args);
    }
}
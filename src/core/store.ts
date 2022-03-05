import { HoneybadgerStore } from "./types";

export class GlobalStore<T> implements HoneybadgerStore<T> {
    private store: T

    constructor(store: T) {
        this.store = store;
    }

    getStore(): T {
        return this.store
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    run<R, TArgs extends any[]>(store: T, callback: (...args: TArgs) => R, ...args: TArgs): R {
        this.store = store;
        return callback(...args);
    }
}
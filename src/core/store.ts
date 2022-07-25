import { HoneybadgerStore, DefaultStoreContents } from './types';

class SyncStore<T> implements HoneybadgerStore<T> {
  private store: T

  constructor(store: T) {
    this.store = store;
  }

  getStore(): T {
    return this.store
  }

  run<R, TArgs extends never[]>(store: T, callback: (...args: TArgs) => R, ...args: TArgs): R {
    this.store = store;
    return callback(...args);
  }

  static create(): SyncStore<DefaultStoreContents> {
    return new SyncStore({ context: {}, breadcrumbs: [] })
  }
}

export const GlobalStore = SyncStore.create()

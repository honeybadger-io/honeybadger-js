import { HoneybadgerStore } from './types';

export class GlobalStore<T> implements HoneybadgerStore<T> {
  private store: T

  constructor(store: T) {
    this.store = store;
  }

  getStore(): T {
    return this.store
  }

  run<R, TArgs extends unknown[]>(store: T, callback: (...args: TArgs) => R, ...args: TArgs): R {
    this.store = store;
    return callback(...args);
  }
}

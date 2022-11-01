import { GlobalStore, Types } from '@honeybadger-io/core';
import { AsyncStore } from './async_store';

/**
 * A store that's really a "stack" of stores (async and global)
 * Will proxy calls to the async store if it's active (ie when we enter an async context via `ALS.run()`),
 * otherwise it will fall back to the global store.
 * Both stores in the stack start out with the same contents object.
 * Note that the asyncStore may be null if ALS is not supported.
 */
export class StackedStore implements Types.HoneybadgerStore {
  private readonly contents: Types.StoreContents
  private readonly asyncStore: AsyncStore|null
  private readonly globalStore: GlobalStore

  constructor(breadcrumbsLimit: number) {
    this.contents = { context: {}, breadcrumbs: [] };
    this.asyncStore = AsyncStore.create(this.contents, breadcrumbsLimit);
    this.globalStore = GlobalStore.create(this.contents, breadcrumbsLimit);
  }

  __activeStore() {
    return this.asyncStore?.available() ? this.asyncStore : this.globalStore
  }

  available() {
    return true;
  }

  // @ts-ignore
  getContents(key?: keyof Types.StoreContents) {
    return this.__activeStore().getContents(key);
  }

  setContext(context) {
    this.__activeStore().setContext(context);
  }

  addBreadcrumb(breadcrumb) {
    this.__activeStore().addBreadcrumb(breadcrumb)
  }

  clear() {
    this.__activeStore().clear();
  }

  run<R>(callback: () => R, request?: Record<symbol, unknown>): R {
    // We explicitly favour the async store here, if ALS is supported. It's the whole point of the `run()` method
    return this.asyncStore ? this.asyncStore.run(callback, request) : this.globalStore.run(callback);
  }
}

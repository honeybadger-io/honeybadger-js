import { Types } from '@honeybadger-io/core';
import { AsyncLocalStorage } from 'async_hooks';

const kHoneybadgerStore = Symbol.for('kHoneybadgerStore');

export class AsyncStore implements Types.HoneybadgerStore {
  private als: AsyncLocalStorage<Types.StoreContents>;
  private readonly contents: Types.StoreContents;
  private readonly breadcrumbsLimit: number;

  constructor(
    asyncLocalStorage: AsyncLocalStorage<Types.StoreContents>,
    contents: Types.StoreContents, breadcrumbsLimit: number
  ) {
    this.als = asyncLocalStorage;
    this.contents = contents;
    this.breadcrumbsLimit = breadcrumbsLimit;
  }

  /**
   * Attempt to create a new AsyncStore instance
   */
  static create(contents: Types.StoreContents, breadcrumbsLimit: number): AsyncStore|null {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { AsyncLocalStorage } = require('async_hooks');
      return new AsyncStore(new AsyncLocalStorage, contents, breadcrumbsLimit);
    } catch (e) {
      return null
    }
  }

  /**
   * This returns the live store object, so we can mutate it.
   * If we're in an async context (a `run()` callback), the stored contents at this point will be returned.
   * Otherwise, the initial stored contents will be returned.
   */
  __currentContents() {
    return this.als.getStore() || this.contents
  }

  getContents(key?: keyof Types.StoreContents) {
    const value = key ? this.__currentContents()[key] : this.__currentContents();
    return JSON.parse(JSON.stringify(value));
  }

  available() {
    return !!this.als.getStore()
  }

  setContext(context: Record<string, unknown>): void {
    Object.assign(this.__currentContents().context, context || {});
  }

  addBreadcrumb(breadcrumb) {
    if (this.__currentContents().breadcrumbs.length == this.breadcrumbsLimit) {
      this.__currentContents().breadcrumbs.shift()
    }
    this.__currentContents().breadcrumbs.push(breadcrumb);
  }

  clear() {
    this.__currentContents().context = {}
    this.__currentContents().breadcrumbs = []
  }

  run<R>(callback: () => R, request?: Record<symbol, unknown>): R {
    // When entering an async context, we pass in *a copy* of the initial contents.
    // This allows every request to start from the same state
    // and add data specific to them, without overlapping.

    if (!request) {
      return this.als.run(this.getContents(), callback);
    }

    let contents: Types.StoreContents;
    if (request[kHoneybadgerStore]) {
      contents = request[kHoneybadgerStore] as Types.StoreContents
    } else {
      contents = this.getContents();
      request[kHoneybadgerStore] = contents;
    }

    return this.als.run(contents, callback);
  }
}

import { HoneybadgerStore, StoreContents } from './types';
import { merge } from './util';

export class GlobalStore implements HoneybadgerStore {
  private readonly contents: StoreContents;
  private readonly breadcrumbsLimit: number;

  constructor(contents: StoreContents, breadcrumbsLimit: number) {
    this.contents = contents;
    this.breadcrumbsLimit = breadcrumbsLimit;
  }

  static create(contents: StoreContents, breadcrumbsLimit: number) {
    return new GlobalStore(contents, breadcrumbsLimit);
  }

  available() {
    return true
  }

  getContents(key?: keyof StoreContents) {
    const value = key ? this.contents[key] : this.contents;
    return JSON.parse(JSON.stringify(value));
  }

  setContext(context) {
    this.contents.context = merge(this.contents.context, context || {});
  }

  addBreadcrumb(breadcrumb) {
    if (this.contents.breadcrumbs.length == this.breadcrumbsLimit) {
      this.contents.breadcrumbs.shift()
    }
    this.contents.breadcrumbs.push(breadcrumb);
  }

  clear() {
    this.contents.context = {}
    this.contents.breadcrumbs = []
  }

  run(callback) {
    return callback();
  }
}

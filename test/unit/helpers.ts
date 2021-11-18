import BaseClient from '../../src/core/client'
import {Logger, Notice, Noticeable} from '../../src/core/types'
import { runAfterNotifyHandlers } from "../../src/core/util";

export function nullLogger (): Logger {
  return {
    log: () => true,
    info: () => true,
    debug: () => true,
    warn: () => true,
    error: () => true
  }
}

export class TestClient extends BaseClient {

  public getContext() {
    return this.__context
  }

  public getBreadcrumbs() {
    return this.__breadcrumbs
  }

  public getPayload(noticeable: Noticeable, name: string | Partial<Notice> = undefined, extra: Partial<Notice> = undefined) {
    // called in client.notify()
    const notice = this.makeNotice(noticeable, name, extra)

    this.addBreadcrumb('Honeybadger Notice', {
      category: 'notice',
      metadata: {
        message: notice.message,
        name: notice.name,
        stack: notice.stack
      }
    })

    notice.__breadcrumbs = this.config.breadcrumbsEnabled ? this.__breadcrumbs.slice() : []

    // called in (server|browser).__send()
    return this.__buildPayload(notice)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  protected __send(notice) {
    runAfterNotifyHandlers(notice, this.__afterNotifyHandlers)
  }
}

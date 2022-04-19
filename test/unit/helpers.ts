import BaseClient from '../../src/core/client'
import { Config, Logger, Notice, Noticeable, Transport, TransportOptions, NoticeTransportPayload } from '../../src/core/types'
import { runAfterNotifyHandlers } from "../../src/core/util";

export function nullLogger(): Logger {
  return {
    log: () => true,
    info: () => true,
    debug: () => true,
    warn: () => true,
    error: () => true
  }
}

export class TestTransport implements Transport {
  send(_options: TransportOptions, _payload: NoticeTransportPayload): Promise<{ statusCode: number; body: string }> {
    return Promise.resolve({body: JSON.stringify({ id: 'uuid' }), statusCode: 201});
  }
}

export class TestClient extends BaseClient {
  protected factory(_opts: Partial<Config>): void {
    throw new Error('Method not implemented.');
  }

  public checkIn(_id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }

  constructor(opts: Partial<Config>, transport: Transport) {
    super(opts, transport);
  }

  public getContext() {
    return this.__store.getStore().context
  }

  public getBreadcrumbs() {
    return this.__store.getStore().breadcrumbs
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

    notice.__breadcrumbs = this.config.breadcrumbsEnabled ? this.getBreadcrumbs().slice() : []

    // called in (server|browser).__send()
    return this.__buildPayload(notice)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  protected __send(notice) {
    runAfterNotifyHandlers(notice, this.__afterNotifyHandlers)
  }
}

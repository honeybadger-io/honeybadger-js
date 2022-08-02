import { Client as BaseClient, Types, Util } from '@honeybadger-io/core'

const { runAfterNotifyHandlers } = Util

export function nullLogger(): Types.Logger {
  return {
    log: () => true,
    info: () => true,
    debug: () => true,
    warn: () => true,
    error: () => true
  }
}

// eslint-disable-next-line import/namespace
export class TestTransport implements Types.Transport {
  send(_options: Types.TransportOptions, _payload: Types.NoticeTransportPayload): Promise<{ statusCode: number; body: string }> {
    return Promise.resolve({ body: JSON.stringify({ id: 'uuid' }), statusCode: 201 });
  }
}

export class TestClient extends BaseClient {
  protected factory(_opts: Partial<Types.Config>): this {
    throw new Error('Method not implemented.');
  }

  public checkIn(_id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }

  constructor(opts: Partial<Types.Config>, transport: Types.Transport) {
    super(opts, transport);
  }

  public getContext() {
    return this.__store.getStore().context
  }

  public getBreadcrumbs() {
    return this.__store.getStore().breadcrumbs
  }

  public getPayload(noticeable: Types.Noticeable, name: string | Partial<Types.Notice> = undefined, extra: Partial<Types.Notice> = undefined) {
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

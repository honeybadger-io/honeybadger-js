import { Client as BaseClient } from '../src/client'
import { Config, Logger, Notice, Noticeable, Transport, TransportOptions, NoticeTransportPayload, UserFeedbackFormOptions } from '../src/types'

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
    return Promise.resolve({ body: JSON.stringify({ id: 'uuid' }), statusCode: 201 });
  }
}

export class TestClient extends BaseClient {
  protected factory(_opts: Partial<Config>): this {
    throw new Error('Method not implemented.');
  }

  public checkIn(_id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }

  protected showUserFeedbackForm(_options: UserFeedbackFormOptions): Promise<void> {
    throw new Error('Method not implemented.');
  }

  constructor(opts: Partial<Config>, transport: Transport) {
    super(opts, transport);
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

    notice.__breadcrumbs = this.config.breadcrumbsEnabled ? this.__getBreadcrumbs() : []

    // called in (server|browser).__send()
    return this.__buildPayload(notice)
  }

  public getPluginsLoaded() {
    return this.__pluginsLoaded
  }
}

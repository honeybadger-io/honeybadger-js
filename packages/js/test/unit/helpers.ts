import { Client as BaseClient, Types } from '@honeybadger-io/core'

export function nullLogger(): Types.Logger {
  return {
    log: () => true,
    info: () => true,
    debug: () => true,
    warn: () => true,
    error: () => true
  }
}

export class TestTransport implements Types.Transport {
  send(_options: Types.TransportOptions, _payload: Types.NoticeTransportPayload): Promise<{ statusCode: number; body: string }> {
    return Promise.resolve({ body: JSON.stringify({ id: 'uuid' }), statusCode: 201 });
  }
}

export class TestClient extends BaseClient {
  protected factory(_opts: Partial<Types.Config>): this {
    throw new Error('Method not implemented.')
  }

  public checkIn(_id: string): Promise<void> {
    throw new Error('Method not implemented.')
  }

  protected showUserFeedbackForm(_options: Types.UserFeedbackFormOptions): Promise<void> {
    throw new Error('Method not implemented.')
  }

  constructor(opts: Partial<Types.Config>, transport: Types.Transport) {
    super(opts, transport)
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

    notice.__breadcrumbs = this.config.breadcrumbsEnabled ? this.__getBreadcrumbs() : []

    // called in (server|browser).__send()
    return this.__buildPayload(notice)
  }
}

import BaseClient from '../../src/core/client'
import { Logger } from '../../src/core/types'

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

  // @ts-ignore
  protected __send(notice) {
    return this.__buildPayload(notice)
  }
}

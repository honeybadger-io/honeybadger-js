import BaseClient from '../../src/core/client'
import { Logger, Notice } from '../../src/core/types'

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
  protected __send (notice: Notice): unknown {
    return this.__buildPayload(notice)
  }
}

// Type definitions for honeybadger.js
// Project: https://github.com/honeybadger-io/honeybadger-js

declare class Honeybadger {
  public factory(config?: Partial<Honeybadger.Config>): Honeybadger
  public notify(notice: Error | string | Partial<Honeybadger.Notice>, name?: string | Partial<Honeybadger.Notice>, extra?: string | Partial<Honeybadger.Notice>): Honeybadger.Notice | false
}

declare namespace Honeybadger {
  interface Logger {
    log(...args: unknown[]): unknown
    info(...args: unknown[]): unknown
    debug(...args: unknown[]): unknown
    warn(...args: unknown[]): unknown
    error(...args: unknown[]): unknown
  }

  interface Config {
    apiKey: string | undefined
    developmentEnvironments: string[]
    environment: string | undefined
    projectRoot: string | undefined
    component: string | undefined
    action: string | undefined
    revision: string | undefined
    disabled: boolean
    debug: boolean
    reportData: boolean
    breadcrumbsEnabled: boolean | { dom: boolean, network: boolean, navigation: boolean, console: boolean }
    maxBreadcrumbs: number
    maxObjectDepth: number
    ignorePatterns: RegExp[]
    logger: Logger
    async: boolean
    maxErrors: number
    onerror: boolean
    onunhandledrejection: boolean
    [x: string]: unknown
  }

  interface BeforeNotifyHandler {
    (notice: Notice): boolean | void
  }

  interface AfterNotifyHandler {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (error: any, notice: Notice): boolean | void
  }

  interface Notice {
    id: string | undefined,
    name: string,
    message: string,
    stack: string,
    fingerprint?: string | undefined,
    url?: string | undefined,
    component?: string | undefined,
    action?: string | undefined,
    context: Record<string, unknown>,
    cgiData: Record<string, unknown>,
    params: Record<string, unknown>,
    cookies: Record<string, unknown> | string,
    projectRoot?: string | undefined,
    environment?: string | undefined,
    revision?: string | undefined,
    afterNotify?: AfterNotifyHandler
  }
}

declare const singleton: Honeybadger
export = singleton

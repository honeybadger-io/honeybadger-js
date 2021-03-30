// Type definitions for honeybadger.js
// Project: https://github.com/honeybadger-io/honeybadger-js

declare class Honeybadger {
  public factory(opts?: Partial<Honeybadger.Config>): Honeybadger
  public notify(notice: Error | string | Partial<Honeybadger.Notice>, name?: string | Partial<Honeybadger.Notice>, extra?: string | Partial<Honeybadger.Notice>): Honeybadger.Notice | false
  public configure(opts: Partial<Honeybadger.Config>): Honeybadger
  public beforeNotify(func: Honeybadger.BeforeNotifyHandler): Honeybadger
  public afterNotify(func: Honeybadger.AfterNotifyHandler): Honeybadger
  public setContext(context: Record<string, unknown>): Honeybadger
  public resetContext(context?: Record<string, unknown>): Honeybadger
  public addBreadcrumb(message: string, opts?: Partial<Honeybadger.BreadcrumbRecord>): Honeybadger

  // Server middleware
  public requestHandler(req, res, next): void
  public errorHandler(err, req, _res, next): unknown
  public lambdaHandler(handler): (event, context, callback) => void
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
    endpoint: string,
    developmentEnvironments: string[]
    environment: string | undefined
    hostname: string | undefined
    projectRoot: string | undefined
    component: string | undefined
    action: string | undefined
    revision: string | undefined
    disabled: boolean
    debug: boolean
    reportData: boolean
    breadcrumbsEnabled: boolean | Partial<{ dom: boolean, network: boolean, navigation: boolean, console: boolean }>
    maxBreadcrumbs: number
    maxObjectDepth: number
    logger: Logger
    enableUncaught: boolean
    afterUncaught: (err: Error) => void
    enableUnhandledRejection: boolean
    tags: string | string[] | unknown
    filters: string[]
    [x: string]: unknown

    // Browser
    async: boolean
    maxErrors: number
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
    backtrace: BacktraceFrame[],
    fingerprint?: string | undefined,
    url?: string | undefined,
    component?: string | undefined,
    action?: string | undefined,
    context: Record<string, unknown>,
    cgiData: Record<string, unknown>,
    params: Record<string, unknown>,
    session: Record<string, unknown>,
    headers: Record<string, unknown>,
    cookies: Record<string, unknown> | string,
    projectRoot?: string | undefined,
    environment?: string | undefined,
    revision?: string | undefined,
    afterNotify?: AfterNotifyHandler
    tags: string | string[]
  }

  interface BacktraceFrame {
    file: string,
    method: string,
    number: number,
    column: number
  }

  interface BreadcrumbRecord {
    category: string,
    message: string,
    metadata: Record<string, unknown>,
    timestamp: string
  }
}

declare const singleton: Honeybadger
export = singleton

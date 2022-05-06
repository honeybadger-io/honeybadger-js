import Client from './client'
import type { AsyncLocalStorage } from 'async_hooks';

export interface Logger {
  log(...args: unknown[]): unknown
  info(...args: unknown[]): unknown
  debug(...args: unknown[]): unknown
  warn(...args: unknown[]): unknown
  error(...args: unknown[]): unknown
}

export interface Config {
  apiKey?: string,
  endpoint: string,
  developmentEnvironments: string[],
  environment?: string
  hostname?: string
  projectRoot?: string
  component?: string
  action?: string
  revision?: string
  debug: boolean
  reportData: boolean
  breadcrumbsEnabled: boolean | { dom?: boolean, network?: boolean, navigation?: boolean, console?: boolean}
  maxBreadcrumbs: number
  maxObjectDepth: number
  logger: Logger
  enableUncaught: boolean
  afterUncaught: (err: Error) => void
  enableUnhandledRejection: boolean
  filters: string[]
  __plugins: Plugin[],
  tags: unknown,
}

export interface ServerlessConfig extends Config {
  reportTimeoutWarning: boolean;
  timeoutWarningThresholdMs: number;
}

export interface BeforeNotifyHandler {
  (notice?: Notice): boolean | void
}

export interface AfterNotifyHandler {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (error: any, notice?: Notice): boolean | void
}

export interface Plugin {
  load(client: Client): void
}

export interface Notice {
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
  tags: string | string[],
  details: Record<string, Record<string, unknown>>,
  __breadcrumbs: BreadcrumbRecord[],
  afterNotify?: AfterNotifyHandler,
  [key: string]: unknown
}

export interface BrowserConfig extends Config {
  async: boolean
  maxErrors: number
}

export type Noticeable = string | Error | Partial<Notice>

export interface BacktraceFrame {
  file: string,
  method: string,
  number: number,
  column: number,
  source?: Record<string, string>
}

export interface BreadcrumbRecord {
  category: string,
  message: string,
  metadata: Record<string, unknown>,
  timestamp: string
}

export interface CGIData {
  HTTP_USER_AGENT: string | undefined,
  HTTP_REFERER: string | undefined,
  HTTP_COOKIE: string | undefined,
  [x: string]: unknown
}

export type ProcessStats = {
 load: {
   one: number,
   five: number,
   fifteen: number
 };
 mem: {
   total?: number,
   free?: number,
   buffers?: number,
   cached?: number,
   free_total?: number
 }
}

export type TransportOptions = {
  method: 'GET' | 'POST',
  headers?: Record<string, number | string | string[] | undefined>,
  endpoint: string,
  maxObjectDepth?: number,
  logger: Logger
  async?: boolean // don't like this here because it's only for browser
}

export type NoticeTransportPayload = {
  notifier: {
    name: string,
    url: string,
    version: string
  },
  breadcrumbs: {
    enabled: boolean,
    trail: BreadcrumbRecord[]
  },
  error: Pick<Notice, 'message' | 'backtrace' | 'fingerprint' | 'tags'> & {
    class: string
  },
  request: Pick<Notice, 'url' | 'component' | 'action' | 'context' | 'params' | 'session'> & {
    cgi_data: unknown
  },
  server: Pick<Notice, 'revision'> & {
    pid?: number | undefined,
    project_root?: string | undefined,
    environment_name?: string | undefined,
    hostname: string,
    time: string,
    stats?: ProcessStats | undefined
  },
  details: Record<string, Record<string, unknown>>
}

export interface Transport {
  send(options: TransportOptions, payload?: NoticeTransportPayload | undefined): Promise<{ statusCode: number; body: string; }>
}

export type HoneybadgerStore<T> = Pick<AsyncLocalStorage<T>, 'getStore' | 'run'>
export type DefaultStoreContents = {context: Record<string, unknown>, breadcrumbs: BreadcrumbRecord[]}

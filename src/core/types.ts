import Client from './client'

export interface Logger {
  log(...args: unknown[]): unknown
  info(...args: unknown[]): unknown
  debug(...args: unknown[]): unknown
  warn(...args: unknown[]): unknown
  error(...args: unknown[]): unknown
}

export interface Config {
  apiKey: string | undefined
  endpoint: string,
  developmentEnvironments: string[],
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
  filters: string[]
  __plugins: Plugin[],
  [x: string]: unknown,
}

export interface BeforeNotifyHandler {
  (notice: Notice): boolean | void
}

export interface AfterNotifyHandler {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (error: any, notice: Notice): boolean | void
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
  tags: string | string[]
  __breadcrumbs: BreadcrumbRecord[],
  afterNotify?: AfterNotifyHandler
}

export interface BacktraceFrame {
  file: string,
  method: string,
  number: number,
  column: number
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

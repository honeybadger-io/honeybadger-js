import { merge, mergeNotice, objectIsEmpty, makeNotice, makeBacktrace, runBeforeNotifyHandlers, isIgnored, newObject, logger } from './util'
import { Config, BeforeNotifyHandler, AfterNotifyHandler, Notice } from './types'

const notifier = {
  name: 'honeybadger-js',
  url: 'https://github.com/honeybadger-io/honeybadger-js',
  version: '__VERSION__'
}

export default class Client {
  private __pluginsExecuted = false

  protected __context = {}
  protected __breadcrumbs = []
  protected __beforeNotifyHandlers = []
  protected __afterNotifyHandlers = []

  config: Config

  constructor(opts: Partial<Config> = {}) {
    this.config = {
      apiKey: null,
      environment: null,
      projectRoot: null,
      component: null,
      action: null,
      revision: null,
      reportData: null,
      breadcrumbsEnabled: true,
      maxBreadcrumbs: 40,
      maxObjectDepth: 8,
      ignorePatterns: [],
      logger: logger(),
      developmentEnvironments: ['dev', 'development', 'test'],
      disabled: false,
      __plugins: [],

      ...opts
    }
  }

  factory(_opts?: Record<string, unknown>): unknown {
    throw (new Error('Must implement __factory in subclass'))
  }

  getVersion(): string {
    return notifier.version
  }

  configure(opts:Partial<Config> = {}): Client {
    for (const k in opts) {
      this.config[k] = opts[k]
    }
    if (!this.__pluginsExecuted) {
      this.__pluginsExecuted = true
      this.config.__plugins.forEach((plugin) => plugin.load(this))
    }
    return this
  }

  beforeNotify(handler: BeforeNotifyHandler): Client {
    this.__beforeNotifyHandlers.push(handler)
    return this
  }

  afterNotify(handler: AfterNotifyHandler): Client {
    this.__afterNotifyHandlers.push(handler)
    return this
  }

  setContext(context: Record<string, unknown>): Client {
    if (typeof context === 'object') {
      this.__context = merge(this.__context, context)
    }
    return this
  }

  resetContext(context: Record<string, unknown>): Client {
    if (typeof context === 'object') {
      this.__context = merge({}, context)
    } else {
      this.__context = {}
    }
    return this
  }

  notify(notice: Partial<Notice>, name = undefined, extra = undefined): Record<string, unknown> | false | unknown {
    if (!this.config.apiKey) {
      this.config.logger.warn('Unable to send error report: no API key has been configured')
      return false
    }

    if (this.config.disabled) {
      this.config.logger.warn('Deprecation warning: instead of `disabled: true`, use `reportData: false` to explicitly disable Honeybadger reporting. (Dropping notice: honeybadger.js is disabled)')
      return false
    }

    if (!this.__reportData()) {
      this.config.logger.debug('Dropping notice: honeybadger.js is in development mode')
      return false
    }

    notice = makeNotice(notice)

    if (name && !(typeof name === 'object')) {
      const n = String(name)
      name = { name: n }
    }

    if (name) {
      notice = mergeNotice(notice, name)
    }
    if (typeof extra === 'object') {
      notice = mergeNotice(notice, extra)
    }

    if (objectIsEmpty(notice)) { return false }

    notice = merge(notice, {
      name: notice.name || 'Error',
      context: merge(this.__context, notice.context),
      projectRoot: notice.projectRoot || this.config.projectRoot,
      environment: notice.environment || this.config.environment,
      component: notice.component || this.config.component,
      action: notice.action || this.config.action,
      revision: notice.revision || this.config.revision
    })

    if (!runBeforeNotifyHandlers(notice, this.__beforeNotifyHandlers)) { return false }

    if (isIgnored(notice, this.config.ignorePatterns)) { return false }

    this.addBreadcrumb('Honeybadger Notice', {
      category: 'notice',
      metadata: {
        message: notice.message,
        name: notice.name,
        stack: notice.stack
      }
    })

    notice.__breadcrumbs = this.config.breadcrumbsEnabled ? this.__breadcrumbs.slice() : []

    return this.__send(notice)
  }

  addBreadcrumb(message: string, opts: Record<string, unknown>): Client {
    if (!this.config.breadcrumbsEnabled) { return }

    opts = opts || {}

    const metadata = newObject(opts.metadata)
    const category = opts.category || 'custom'
    const timestamp = new Date().toISOString()

    this.__breadcrumbs.push({
      category: category,
      message: message,
      metadata: metadata,
      timestamp: timestamp
    })

    const limit = this.config.maxBreadcrumbs
    if (this.__breadcrumbs.length > limit) {
      this.__breadcrumbs = this.__breadcrumbs.slice(this.__breadcrumbs.length - limit)
    }

    return this
  }

  private __reportData(): boolean {
    if (this.config.reportData !== null) {
      return this.config.reportData
    }
    return !(this.config.environment && this.config.developmentEnvironments.includes(this.config.environment))
  }

  protected __send(_notice: Partial<Notice>): unknown {
    throw (new Error('Must implement send in subclass'))
  }

  protected __buildPayload(notice: Notice): Record<string, Record<string, unknown>> {
    return {
      notifier: notifier,
      breadcrumbs: {
        enabled: !!this.config.breadcrumbsEnabled,
        trail: notice.__breadcrumbs || []
      },
      error: {
        class: notice.name,
        message: notice.message,
        backtrace: makeBacktrace(notice.stack),
        raw_backtrace: notice.stack,
        fingerprint: notice.fingerprint
      },
      request: {
        url: notice.url,
        component: notice.component,
        action: notice.action,
        context: notice.context,
        cgi_data: notice.cgiData || {},
        params: notice.params
      },
      server: {
        project_root: notice.projectRoot,
        environment_name: notice.environment,
        revision: notice.revision
      }
    }
  }
}

import {
  merge,
  mergeNotice,
  objectIsEmpty,
  makeNotice,
  makeBacktrace,
  runBeforeNotifyHandlers,
  newObject,
  logger,
  generateStackTrace,
  filter,
  filterUrl,
  formatCGIData,
  getSourceForBacktrace
} from './util'
import {
  Config, Logger, BreadcrumbRecord, BeforeNotifyHandler, AfterNotifyHandler, Notice, Noticeable
} from './types'

const notifier = {
  name: 'honeybadger-js',
  url: 'https://github.com/honeybadger-io/honeybadger-js',
  version: '__VERSION__'
}

// Split at commas
const TAG_SEPARATOR = /,/

// Removes any non-word characters
const TAG_SANITIZER = /[^\w]/g

// Checks for blank strings
const STRING_EMPTY = ''

// Checks for non-blank characters
const NOT_BLANK = /\S/

export default class Client {
  /** @internal */
  private __pluginsExecuted = false

  /** @internal */
  protected __context: Record<string, unknown> = {}
  /** @internal */
  protected __breadcrumbs: BreadcrumbRecord[] = []
  /** @internal */
  protected __beforeNotifyHandlers: BeforeNotifyHandler[] = []
  /** @internal */
  protected __afterNotifyHandlers: AfterNotifyHandler[] = []

  /** @internal */
  protected __getSourceFileHandler: (path: string, cb: (fileContent: string) => void) => void

  config: Config
  logger: Logger

  constructor(opts: Partial<Config> = {}) {
    this.config = {
      apiKey: null,
      endpoint: 'https://api.honeybadger.io',
      environment: null,
      hostname: null,
      projectRoot: null,
      component: null,
      action: null,
      revision: null,
      reportData: null,
      breadcrumbsEnabled: true,
      maxBreadcrumbs: 40,
      maxObjectDepth: 8,
      logger: console,
      developmentEnvironments: ['dev', 'development', 'test'],
      disabled: false,
      debug: false,
      tags: null,
      enableUncaught: true,
      enableUnhandledRejection: true,
      afterUncaught: () => true,
      filters: ['creditcard', 'password'],
      __plugins: [],

      ...opts,
    }
    this.logger = logger(this)
  }

  factory(_opts?: Record<string, unknown>): unknown {
    throw (new Error('Must implement __factory in subclass'))
  }

  getVersion(): string {
    return notifier.version
  }

  configure(opts: Partial<Config> = {}): Client {
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

  resetContext(context?: Record<string, unknown>): Client {
    this.logger.warn('Deprecation warning: `Honeybadger.resetContext()` has been deprecated; please use `Honeybadger.clear()` instead.')
    if (typeof context === 'object' && context !== null) {
      this.__context = merge({}, context)
    } else {
      this.__context = {}
    }
    return this
  }

  clear(): Client {
    this.__context = {}
    this.__breadcrumbs = []
    return this
  }

  notify(noticeable: Noticeable, name: string | Partial<Notice> = undefined, extra: Partial<Notice> = undefined): boolean {
    const notice = this.makeNotice(noticeable, name, extra)
    if (!notice) {
      return false
    }

    if (this.config.disabled) {
      this.logger.warn('Deprecation warning: instead of `disabled: true`, use `reportData: false` to explicitly disable Honeybadger reporting. (Dropping notice: honeybadger.js is disabled)', notice)
      return false
    }

    if (!this.__reportData()) {
      this.logger.warn('Dropping notice: honeybadger.js is in development mode', notice)
      return false
    }

    if (!this.config.apiKey) {
      this.logger.warn('Unable to send error report: no API key has been configured', notice)
      return false
    }

    // we need to have the source file data before the beforeNotifyHandlers,
    // in case they modify them
    const sourceCodeData = notice.backtrace.slice()

    if (!runBeforeNotifyHandlers(notice, this.__beforeNotifyHandlers)) {
      return false
    }

    this.addBreadcrumb('Honeybadger Notice', {
      category: 'notice',
      metadata: {
        message: notice.message,
        name: notice.name,
        stack: notice.stack
      }
    })

    notice.__breadcrumbs = this.config.breadcrumbsEnabled ? this.__breadcrumbs.slice() : []

    getSourceForBacktrace(sourceCodeData, this.__getSourceFileHandler, sourcePerTrace => {
      sourcePerTrace.forEach((source, index) => {
        notice.backtrace[index].source = source
      })

      this.__send(notice)
    })

    return true
  }

  protected makeNotice(noticeable: Noticeable, name: string | Partial<Notice> = undefined, extra: Partial<Notice> = undefined): Notice {
    let notice = makeNotice(noticeable)

    if (name && !(typeof name === 'object')) {
      const n = String(name)
      name = {name: n}
    }

    if (name) {
      notice = mergeNotice(notice, name as Partial<Notice>)
    }
    if (typeof extra === 'object' && extra !== null) {
      notice = mergeNotice(notice, extra)
    }

    if (objectIsEmpty(notice)) {
      return null
    }

    const noticeTags = this.__constructTags(notice.tags)
    const contextTags = this.__constructTags(this.__context["tags"])
    const configTags = this.__constructTags(this.config.tags)

    // Turning into a Set will remove duplicates
    const tags = noticeTags.concat(contextTags).concat(configTags)
    const uniqueTags = tags.filter((item, index) => tags.indexOf(item) === index)

    notice = merge(notice, {
      name: notice.name || 'Error',
      context: merge(this.__context, notice.context),
      projectRoot: notice.projectRoot || this.config.projectRoot,
      environment: notice.environment || this.config.environment,
      component: notice.component || this.config.component,
      action: notice.action || this.config.action,
      revision: notice.revision || this.config.revision,
      tags: uniqueTags
    })

    let backtraceShift = 0
    if (typeof notice.stack !== 'string' || !notice.stack.trim()) {
      notice.stack = generateStackTrace()
      backtraceShift = 2
    }

    notice.backtrace = makeBacktrace(notice.stack, backtraceShift)

    return notice as Notice
  }

  addBreadcrumb(message: string, opts?: Record<string, unknown>): Client {
    if (!this.config.breadcrumbsEnabled) {
      return
    }

    opts = opts || {}

    const metadata = newObject(opts.metadata)
    const category = opts.category || 'custom'
    const timestamp = new Date().toISOString()

    this.__breadcrumbs.push({
      category: category as string,
      message: message,
      metadata: metadata as Record<string, unknown>,
      timestamp: timestamp
    })

    const limit = this.config.maxBreadcrumbs
    if (this.__breadcrumbs.length > limit) {
      this.__breadcrumbs = this.__breadcrumbs.slice(this.__breadcrumbs.length - limit)
    }

    return this
  }

  /** @internal */
  protected __reportData(): boolean {
    if (this.config.reportData !== null) {
      return this.config.reportData
    }
    return !(this.config.environment && this.config.developmentEnvironments.includes(this.config.environment))
  }

  /** @internal */
  protected __send(_notice: Partial<Notice>): void {
    throw (new Error('Must implement send in subclass'))
  }

  /** @internal */
  protected __buildPayload(notice: Notice): Record<string, Record<string, unknown>> {
    const headers = filter(notice.headers, this.config.filters) || {}
    const cgiData = filter({
      ...notice.cgiData,
      ...formatCGIData(headers, 'HTTP_')
    }, this.config.filters)

    return {
      notifier: notifier,
      breadcrumbs: {
        enabled: !!this.config.breadcrumbsEnabled,
        trail: notice.__breadcrumbs || []
      },
      error: {
        class: notice.name,
        message: notice.message,
        backtrace: notice.backtrace,
        fingerprint: notice.fingerprint,
        tags: notice.tags
      },
      request: {
        url: filterUrl(notice.url, this.config.filters),
        component: notice.component,
        action: notice.action,
        context: notice.context,
        cgi_data: cgiData,
        params: filter(notice.params, this.config.filters) || {},
        session: filter(notice.session, this.config.filters) || {}
      },
      server: {
        project_root: notice.projectRoot,
        environment_name: notice.environment,
        revision: notice.revision,
        hostname: this.config.hostname,
        time: new Date().toUTCString()
      },
      details: notice.details || {}
    }
  }

  /** @internal */
  protected __constructTags(tags: unknown): Array<string> {
    if (!tags) {
      return []
    }

    return tags.toString().split(TAG_SEPARATOR).map((tag: string) => {
      return tag.replace(TAG_SANITIZER, STRING_EMPTY)
    }).filter((tag) => NOT_BLANK.test(tag))
  }
}

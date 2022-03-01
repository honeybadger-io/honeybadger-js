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
  getSourceForBacktrace,
  runAfterNotifyHandlers
} from './util'
import {
  Config,
  Logger,
  BeforeNotifyHandler,
  AfterNotifyHandler,
  Notice,
  Noticeable,
  HoneybadgerStore,
  BacktraceFrame,
  BreadcrumbRecord
} from './types'
import { DefaultStore } from "./store";

const notifier = {
  name: 'honeybadger-js',
  url: 'https://github.com/honeybadger-io/honeybadger-js',
  version: '__VERSION__'
}

// Split at commas and spaces
const TAG_SEPARATOR = /,|\s+/

// Checks for non-blank characters
const NOT_BLANK = /\S/

export default class Client {
  private __pluginsExecuted = false

  protected __store: HoneybadgerStore<{ context: Record<string, unknown>; breadcrumbs: BreadcrumbRecord[] }> = null;
  protected __beforeNotifyHandlers: BeforeNotifyHandler[] = []
  protected __afterNotifyHandlers: AfterNotifyHandler[] = []
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

  factory(_opts?: Partial<Config>): Client {
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

    this.__store = opts.store || new DefaultStore({ context: {}, breadcrumbs: [] })

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
      const store = this.__store.getStore()
      store.context = merge(store.context, context)
    }
    return this
  }

  resetContext(context?: Record<string, unknown>): Client {
    this.logger.warn('Deprecation warning: `Honeybadger.resetContext()` has been deprecated; please use `Honeybadger.clear()` instead.')
    const store = this.__store.getStore()

    if (typeof context === 'object' && context !== null) {
      store.context = context
    }
    else {
      store.context = {}
    }

    return this
  }

  clear(): Client {
    const store = this.__store.getStore()
    store.context = {}
    store.breadcrumbs = []

    return this
  }

  notify(noticeable: Noticeable, name: string | Partial<Notice> = undefined, extra: Partial<Notice> = undefined): boolean {
    let preConditionError: Error = null
    const notice = this.makeNotice(noticeable, name, extra)
    if (!notice) {
      this.logger.debug('failed to build error report')
      preConditionError = new Error('failed to build error report')
    }

    if (!preConditionError && this.config.reportData === false) {
      this.logger.debug('skipping error report: honeybadger.js is disabled', notice)
      preConditionError = new Error('honeybadger.js is disabled')
    }

    if (!preConditionError && this.__developmentMode()) {
      this.logger.log('honeybadger.js is in development mode; the following error report will be sent in production.', notice)
      preConditionError = new Error('honeybadger.js is in development mode')
    }

    if (!preConditionError && !this.config.apiKey) {
      this.logger.warn('could not send error report: no API key has been configured', notice)
      preConditionError = new Error('missing API key')
    }

    const beforeNotifyResult = runBeforeNotifyHandlers(notice, this.__beforeNotifyHandlers)
    if (!preConditionError && !beforeNotifyResult) {
      this.logger.debug('skipping error report: beforeNotify handlers returned false', notice)
      preConditionError = new Error('beforeNotify handlers returned false')
    }

    if (preConditionError) {
      runAfterNotifyHandlers(notice, this.__afterNotifyHandlers, preConditionError)
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

    const breadcrumbs = this.__store.getStore().breadcrumbs
    notice.__breadcrumbs = this.config.breadcrumbsEnabled ? breadcrumbs.slice() : []

    // we need to have the source file data before the beforeNotifyHandlers,
    // in case they modify them
    const sourceCodeData = notice && notice.backtrace ? notice.backtrace.map(trace => newObject(trace) as BacktraceFrame) : null

    getSourceForBacktrace(sourceCodeData, this.__getSourceFileHandler, sourcePerTrace => {
      sourcePerTrace.forEach((source, index) => {
        notice.backtrace[index].source = source
      })

      this.__send(notice)
    })

    return true
  }

  /**
   * An async version of {@link notify} that resolves only after the notice has been reported to Honeybadger.
   * Implemented using the {@link afterNotify} hook.
   * Rejects if for any reason the report failed to be reported.
   * Useful in serverless environments (AWS Lambda).
   */
  notifyAsync(noticeable: Noticeable, name: string | Partial<Notice> = undefined, extra: Partial<Notice> = undefined): Promise<void> {
    return new Promise((resolve, reject) => {
      const applyAfterNotify = (partialNotice: Partial<Notice>) => {
        const originalAfterNotify = partialNotice.afterNotify
        partialNotice.afterNotify = (err?: Error) => {
          originalAfterNotify?.call(this, err)
          if (err) {
            return reject(err)
          }
          resolve()
        }
      }

      // We have to respect any afterNotify hooks that come from the arguments
      let objectToOverride: Partial<Notice>
      if ((noticeable as Partial<Notice>).afterNotify) {
        objectToOverride = noticeable as Partial<Notice>
      }
      else if (name && (name as Partial<Notice>).afterNotify) {
        objectToOverride = name as Partial<Notice>
      }
      else if (extra && extra.afterNotify) {
        objectToOverride = extra
      }
      else if (name && typeof name === 'object') {
        objectToOverride = name
      }
      else if (extra) {
        objectToOverride = extra
      }
      else {
        objectToOverride = name = {}
      }

      applyAfterNotify(objectToOverride)
      this.notify(noticeable, name, extra)
    })
  }

  protected makeNotice(noticeable: Noticeable, name: string | Partial<Notice> = undefined, extra: Partial<Notice> = undefined): Notice | null {
    let notice = makeNotice(noticeable)

    if (name && !(typeof name === 'object')) {
      const n = String(name)
      name = { name: n }
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

    const context = this.__store.getStore().context
    const noticeTags = this.__constructTags(notice.tags)
    const contextTags = this.__constructTags(context["tags"])
    const configTags = this.__constructTags(this.config.tags)

    // Turning into a Set will remove duplicates
    const tags = noticeTags.concat(contextTags).concat(configTags)
    const uniqueTags = tags.filter((item, index) => tags.indexOf(item) === index)

    notice = merge(notice, {
      name: notice.name || 'Error',
      context: merge(context, notice.context),
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

    const store = this.__store.getStore()
    let breadcrumbs = store.breadcrumbs
    breadcrumbs.push({
      category: category as string,
      message: message,
      metadata: metadata as Record<string, unknown>,
      timestamp: timestamp
    })

    const limit = this.config.maxBreadcrumbs
    if (breadcrumbs.length > limit) {
      breadcrumbs = breadcrumbs.slice(breadcrumbs.length - limit)
    }
    store.breadcrumbs = breadcrumbs

    return this
  }

  protected __developmentMode(): boolean {
    if (this.config.reportData === true) { return false }
    return (this.config.environment && this.config.developmentEnvironments.includes(this.config.environment))
  }

  protected __send(_notice: Partial<Notice>): void {
    throw (new Error('Must implement send in subclass'))
  }

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

  protected __constructTags(tags: unknown): Array<string> {
    if (!tags) {
      return []
    }

    return tags.toString().split(TAG_SEPARATOR).filter((tag) => NOT_BLANK.test(tag))
  }
}

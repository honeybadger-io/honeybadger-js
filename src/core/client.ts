import {
  merge,
  mergeNotice,
  objectIsEmpty,
  makeNotice,
  makeBacktrace,
  runBeforeNotifyHandlers,
  shallowClone,
  logger,
  generateStackTrace,
  filter,
  filterUrl,
  formatCGIData,
  getSourceForBacktrace,
  runAfterNotifyHandlers, endpoint, isBrowserConfig
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
  BreadcrumbRecord,
  DefaultStoreContents, Transport, NoticeTransportPayload
} from './types'
import { GlobalStore } from "./store";

const notifier = {
  name: 'honeybadger-js',
  url: 'https://github.com/honeybadger-io/honeybadger-js',
  version: '__VERSION__'
}

// Split at commas and spaces
const TAG_SEPARATOR = /,|\s+/

// Checks for non-blank characters
const NOT_BLANK = /\S/

export default abstract class Client {
  protected __pluginsExecuted = false

  protected __store: HoneybadgerStore<{ context: Record<string, unknown>; breadcrumbs: BreadcrumbRecord[] }> = null;
  protected __beforeNotifyHandlers: BeforeNotifyHandler[] = []
  protected __afterNotifyHandlers: AfterNotifyHandler[] = []
  protected __getSourceFileHandler: (path: string, cb: (fileContent: string) => void) => void

  protected readonly __transport: Transport;

  config: Config
  logger: Logger

  protected constructor(opts: Partial<Config> = {}, transport: Transport) {
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

    // First, we go with the global (shared) store.
    // Webserver middleware can then switch to the AsyncStore for async context tracking.
    this.__store = new GlobalStore({ context: {}, breadcrumbs: [] })
    this.__transport = transport
    this.logger = logger(this)
  }

  protected abstract factory(opts: Partial<Config>): void;

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

  /** @internal */
  __setStore(store: HoneybadgerStore<{ context: Record<string, unknown>; breadcrumbs: BreadcrumbRecord[] }>) {
    this.__store = store
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

    const breadcrumbs = this.__getStoreContentsOrDefault().breadcrumbs
    notice.__breadcrumbs = this.config.breadcrumbsEnabled ? breadcrumbs.slice() : []

    // we need to have the source file data before the beforeNotifyHandlers,
    // in case they modify them
    const sourceCodeData = notice && notice.backtrace ? notice.backtrace.map(trace => shallowClone(trace) as BacktraceFrame) : null

    getSourceForBacktrace(sourceCodeData, this.__getSourceFileHandler, sourcePerTrace => {
      sourcePerTrace.forEach((source, index) => {
        notice.backtrace[index].source = source
      })

      const payload = this.__buildPayload(notice)
      this.__transport
          .send({
            headers: {
              'X-API-Key': this.config.apiKey,
              'Content-Type': 'application/json',
              'Accept': 'text/json, application/json'
            },
            method: 'POST',
            endpoint: endpoint(this.config.endpoint, '/v1/notices/js'),
            maxObjectDepth: this.config.maxObjectDepth,
            logger: this.logger,
          }, payload)
          .then(res => {
            if (res.statusCode !== 201) {
              runAfterNotifyHandlers(notice, this.__afterNotifyHandlers, new Error(`Bad HTTP response: ${res.statusCode}`))
              this.logger.warn(`Error report failed: unknown response from server. code=${res.statusCode}`)
              return
            }
            const uuid = JSON.parse(res.body).id
            runAfterNotifyHandlers(merge(notice, {
              id: uuid
            }), this.__afterNotifyHandlers)
            this.logger.info(`Error report sent ⚡ https://app.honeybadger.io/notice/${uuid}`)
          })
          .catch(err => {
            this.logger.error('Error report failed: an unknown error occurred.', `message=${err.message}`)
            runAfterNotifyHandlers(notice, this.__afterNotifyHandlers, err)
          })
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

  checkIn(id: string): void {
    this.checkInAsync(id).then()
  }

  checkInAsync(id: string): Promise<void> {
    return this.__transport
        .send({
          method: 'GET',
          endpoint: endpoint(this.config.endpoint, `v1/check_in/${id}`),
          logger: this.logger,
          async: isBrowserConfig(this.config) ? this.config.async : false,
        })
        .then(() => {
          this.logger.info(`CheckIn sent`)
          return Promise.resolve()
        })
        .catch(err => {
          this.logger.error('CheckIn failed: an unknown error occurred.', `message=${err.message}`)
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

    const context = this.__getStoreContentsOrDefault().context
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

    const metadata = shallowClone(opts.metadata)
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

  protected __buildPayload(notice: Notice): NoticeTransportPayload {
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

  /**
   * For ALS, the store may be uninitialized (if .run()` has not been called).
   * This provides an easy way to read the existing store object or fall back to a default.
   * Returns *a copy* of the store contents.
   * @internal
   */
  protected __getStoreContentsOrDefault(): DefaultStoreContents {
    const existingStoreContents = this.__store.getStore();
    const storeContents = existingStoreContents || {};
    return {
      context: {},
      breadcrumbs: [],
      ...storeContents
    };
  }
}

import {
  merge,
  mergeNotice,
  objectIsEmpty,
  makeNotice,
  makeBacktrace,
  runBeforeNotifyHandlers,
  shallowClone,
  logger,
  logDeprecatedMethod,
  generateStackTrace,
  filter,
  filterUrl,
  formatCGIData,
  getSourceForBacktrace,
  runAfterNotifyHandlers,
  endpoint,
  getCauses,
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
  Transport,
  NoticeTransportPayload,
  UserFeedbackFormOptions,
  Notifier, EventsLogger,
} from './types'
import { GlobalStore } from './store';
import { ThrottledEventsLogger } from './throttled_events_logger';
import { CONFIG as DEFAULT_CONFIG } from './defaults';

// Split at commas and spaces
const TAG_SEPARATOR = /,|\s+/

// Checks for non-blank characters
const NOT_BLANK = /\S/

export abstract class Client {
  protected __pluginsLoaded = false

  protected __store: HoneybadgerStore = null;
  protected __beforeNotifyHandlers: BeforeNotifyHandler[] = []
  protected __afterNotifyHandlers: AfterNotifyHandler[] = []
  protected __getSourceFileHandler: (path: string) => Promise<string>

  protected readonly __transport: Transport;
  protected readonly __eventsLogger: EventsLogger;

  protected __notifier: Notifier = {
    name: '@honeybadger-io/core',
    url: 'https://github.com/honeybadger-io/honeybadger-js/tree/master/packages/core',
    version: '__VERSION__'
  }

  config: Config
  logger: Logger

  protected constructor(opts: Partial<Config> = {}, transport: Transport) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...opts,
    }

    this.__initStore();
    this.__transport = transport
    this.__eventsLogger = new ThrottledEventsLogger(this.config, this.__transport)
    this.logger = logger(this)
  }

  protected abstract factory(opts: Partial<Config>): this

  protected abstract checkIn(id: string): Promise<void>

  protected abstract showUserFeedbackForm(options: UserFeedbackFormOptions): Promise<void>

  getVersion(): string {
    return this.__notifier.version
  }

  getNotifier() {
    return this.__notifier
  }

  /**
   * CAREFUL: When adding a new notifier or updating the name of an existing notifier,
   * the Honeybadger rails project may need its mappings updated.
   * See https://github.com/honeybadger-io/honeybadger/blob/master/app/presenters/breadcrumbs_presenter.rb
   *     https://github.com/honeybadger-io/honeybadger/blob/master/app/models/parser/java_script.rb
   *     https://github.com/honeybadger-io/honeybadger/blob/master/app/models/language.rb
   **/
  setNotifier(notifier: Notifier) {
    this.__notifier = notifier
  }

  configure(opts: Partial<Config> = {}): this {
    for (const k in opts) {
      this.config[k] = opts[k]
    }
    this.__eventsLogger.configure(this.config)
    this.loadPlugins()

    return this
  }

  loadPlugins() {
    const pluginsToLoad = this.__pluginsLoaded
      ? this.config.__plugins.filter(plugin => plugin.shouldReloadOnConfigure)
      : this.config.__plugins
    pluginsToLoad.forEach(plugin => plugin.load(this))
    this.__pluginsLoaded = true
  }

  protected __initStore() {
    this.__store = new GlobalStore({ context: {}, breadcrumbs: [] }, this.config.maxBreadcrumbs);
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
    if (typeof context === 'object' && context != null) {
      this.__store.setContext(context)
    }
    return this
  }

  resetContext(context?: Record<string, unknown>): Client {
    this.logger.warn('Deprecation warning: `Honeybadger.resetContext()` has been deprecated; please use `Honeybadger.clear()` instead.')
    this.__store.clear()
    if (typeof context === 'object' && context !== null) {
      this.__store.setContext(context)
    }

    return this
  }

  clear(): Client {
    this.__store.clear()

    return this
  }

  notify(noticeable: Noticeable, name: string | Partial<Notice> = undefined, extra: Partial<Notice> = undefined): boolean {
    const notice = this.makeNotice(noticeable, name, extra)

    // we need to have the source file data before the beforeNotifyHandlers,
    // in case they modify them
    const sourceCodeData = notice && notice.backtrace ? notice.backtrace.map(trace => shallowClone(trace) as BacktraceFrame) : null
    const preConditionsResult = this.__runPreconditions(notice)
    if (preConditionsResult instanceof Error) {
      runAfterNotifyHandlers(notice, this.__afterNotifyHandlers, preConditionsResult)

      return false
    }

    if (preConditionsResult instanceof Promise) {
      preConditionsResult.then((result) => {
        if (result instanceof Error) {
          runAfterNotifyHandlers(notice, this.__afterNotifyHandlers, result)

          return false
        }
        return this.__send(notice, sourceCodeData)
      })

      return true
    }

    this.__send(notice, sourceCodeData).catch((_err) => { /* error is already caught and logged */ })

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

    const context = this.__store.getContents('context')
    const noticeTags = this.__constructTags(notice.tags)
    const contextTags = this.__constructTags(context['tags'])
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
      tags: uniqueTags,
    })

    // If we're passed a custom backtrace array, use it
    // Otherwise we make one.
    if (!Array.isArray(notice.backtrace) || !notice.backtrace.length) {
      if (typeof notice.stack !== 'string' || !notice.stack.trim()) {
        notice.stack = generateStackTrace()
        notice.backtrace = makeBacktrace(notice.stack, true, this.logger)
      } else {
        notice.backtrace = makeBacktrace(notice.stack, false, this.logger)
      }
    }

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

    this.__store.addBreadcrumb({
      category: category as string,
      message,
      metadata: metadata as Record<string, unknown>,
      timestamp
    })

    return this
  }

  /**
   * @deprecated Use {@link event} instead.
   */
  logEvent(data: Record<string, unknown>): void {
    logDeprecatedMethod(this.logger, 'Honeybadger.logEvent', 'Honeybadger.event')
    this.event('log', data)
  }

  event(data: Record<string, unknown>): void;
  event(type: string, data: Record<string, unknown>): void;
  event(type: string | Record<string, unknown>, data?: Record<string, unknown>): void {
    if (typeof type === 'object') {
      data = type
      type = type['event_type'] as string ?? undefined
    }
    this.__eventsLogger.log({
      event_type: type,
      ts: new Date().toISOString(),
      ...data
    })
  }

  /**
   * This method currently flushes the event (Insights) queue.
   * In the future, it should also flush the error queue (assuming an error throttler is implemented).
   */
  flushAsync(): Promise<void> {
    return this.__eventsLogger.flushAsync();
  }

  __getBreadcrumbs() {
    return this.__store.getContents('breadcrumbs').slice()
  }

  __getContext() {
    return this.__store.getContents('context')
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
      notifier: this.__notifier,
      breadcrumbs: {
        enabled: !!this.config.breadcrumbsEnabled,
        trail: notice.__breadcrumbs || []
      },
      error: {
        class: notice.name,
        message: notice.message,
        backtrace: notice.backtrace,
        fingerprint: notice.fingerprint,
        tags: notice.tags,
        causes: getCauses(notice, this.logger),
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

  private __runPreconditions(notice: Notice): Error | null | Promise<Error | null> {
    let preConditionError: Error | null = null
    if (!notice) {
      this.logger.debug('failed to build error report')
      preConditionError = new Error('failed to build error report')
    }

    if (this.config.reportData === false) {
      this.logger.debug('skipping error report: honeybadger.js is disabled', notice)
      preConditionError = new Error('honeybadger.js is disabled')
    }

    if (this.__developmentMode()) {
      this.logger.log('honeybadger.js is in development mode; the following error report will be sent in production.', notice)
      preConditionError = new Error('honeybadger.js is in development mode')
    }

    if (!this.config.apiKey) {
      this.logger.warn('could not send error report: no API key has been configured', notice)
      preConditionError = new Error('missing API key')
    }

    const beforeNotifyResult = runBeforeNotifyHandlers(notice, this.__beforeNotifyHandlers)
    if (!preConditionError && !beforeNotifyResult.result) {
      this.logger.debug('skipping error report: one or more beforeNotify handlers returned false', notice)
      preConditionError = new Error('beforeNotify handlers returned false')
    }

    if (beforeNotifyResult.results.length && beforeNotifyResult.results.some(result => result instanceof Promise)) {
      return Promise.allSettled(beforeNotifyResult.results)
        .then((results) => {
          if (!preConditionError && (results.some(result => result.status === 'rejected' || result.value === false))) {
            this.logger.debug('skipping error report: one or more beforeNotify handlers returned false', notice)
            preConditionError = new Error('beforeNotify handlers (async) returned false')
          }

          if (preConditionError) {
            return preConditionError
          }
        })
    }

    return preConditionError
  }

  private __send(notice: Notice, originalBacktrace: BacktraceFrame[]) {
    if (this.config.breadcrumbsEnabled) {
      this.addBreadcrumb('Honeybadger Notice', {
        category: 'notice',
        metadata: {
          message: notice.message,
          name: notice.name,
          stack: notice.stack
        }
      })
      notice.__breadcrumbs = this.__store.getContents('breadcrumbs')
    }
    else {
      notice.__breadcrumbs = []
    }

    return getSourceForBacktrace(originalBacktrace, this.__getSourceFileHandler)
      .then(async (sourcePerTrace) => {
        sourcePerTrace.forEach((source, index) => {
          notice.backtrace[index].source = source
        })

        const payload = this.__buildPayload(notice)
        return this.__transport
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
      })
      .then(res => {
        if (res.statusCode !== 201) {
          runAfterNotifyHandlers(notice, this.__afterNotifyHandlers, new Error(`Bad HTTP response: ${res.statusCode}`))
          this.logger.warn(`Error report failed: unknown response from server. code=${res.statusCode}`)

          return false
        }
        const uuid = JSON.parse(res.body).id
        runAfterNotifyHandlers(merge(notice, {
          id: uuid
        }), this.__afterNotifyHandlers)
        this.logger.info(`Error report sent ⚡ https://app.honeybadger.io/notice/${uuid}`)

        return true
      })
      .catch(err => {
        this.logger.error('Error report failed: an unknown error occurred.', `message=${err.message}`)
        runAfterNotifyHandlers(notice, this.__afterNotifyHandlers, err)

        return false
      })
  }
}

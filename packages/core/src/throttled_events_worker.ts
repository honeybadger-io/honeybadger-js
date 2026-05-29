import { Transport, Config, EventsWorker, Logger, EventPayload } from './types'
import { NdJson } from 'json-nd'
import { endpoint } from './util'
import { CONFIG as DEFAULT_CONFIG } from './defaults';

export class ThrottledEventsWorker implements EventsWorker {
  private queue: EventPayload[] = []
  private cooldownTimer: ReturnType<typeof setTimeout> | null = null
  private inFlight: Promise<void> | null = null
  private logger: Logger

  constructor(private readonly config: Partial<Config>, private transport: Transport) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    }
    this.logger = this.originalLogger()
  }

  configure(opts: Partial<Config>): void {
    for (const k in opts) {
      this.config[k] = opts[k]
    }
  }

  log(payload: EventPayload) {
    this.queue.push(payload)

    if (this.inFlight) {
      return
    }

    if (this.cooldownTimer) {
      if (this.queue.length >= this.bulkThreshold()) {
        clearTimeout(this.cooldownTimer)
        this.cooldownTimer = null
        this.processQueue()
      }
      return
    }

    this.processQueue()
  }

  flushAsync(): Promise<void> {
    this.logger.debug('[Honeybadger] Flushing events')
    if (this.cooldownTimer) {
      clearTimeout(this.cooldownTimer)
      this.cooldownTimer = null
    }
    const previous = this.inFlight ?? Promise.resolve()
    return previous.then(() => this.drainAll())
  }

  private async drainAll(): Promise<void> {
    while (this.queue.length > 0) {
      await this.send()
    }
  }

  private processQueue() {
    if (this.queue.length === 0 || this.inFlight) {
      return
    }

    this.inFlight = this.send()
      .catch((error) => {
        this.logger.error('[Honeybadger] Error making HTTP request:', error)
      })
      .then(() => {
        this.inFlight = null
        this.scheduleNextDispatch()
      })
  }

  private scheduleNextDispatch() {
    if (this.queue.length >= this.bulkThreshold()) {
      this.processQueue()
      return
    }
    this.cooldownTimer = setTimeout(() => {
      this.cooldownTimer = null
      this.processQueue()
    }, this.dispatchIntervalMs())
  }

  private async send(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    const eventsData = this.queue.splice(0, this.bulkThreshold())

    const data = NdJson.stringify(eventsData)
    return this.makeHttpRequest(data)
  }

  private bulkThreshold(): number {
    const v = this.config.insights?.bulkThreshold
    return typeof v === 'number' && v > 0 ? v : DEFAULT_CONFIG.insights.bulkThreshold
  }

  private dispatchIntervalMs(): number {
    const v = this.config.insights?.dispatchIntervalSeconds
    const seconds = typeof v === 'number' && v >= 0 ? v : DEFAULT_CONFIG.insights.dispatchIntervalSeconds
    return seconds * 1000
  }

  private async makeHttpRequest(data: string): Promise<void> {
    return this.transport
      .send({
        headers: {
          'X-API-Key': this.config.apiKey,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        endpoint: endpoint(this.config.endpoint, '/v1/events'),
        maxObjectDepth: this.config.maxObjectDepth,
        logger: this.logger,
      }, data)
      .then((resp: { statusCode: number, body: string }) => {
        if ([200, 201].includes(resp.statusCode)) {
          this.logger.debug('[Honeybadger] Events sent successfully')
        } else {
          this.logger.debug(`[Honeybadger] Events failed[${resp.statusCode}]: ${resp.body}`)
        }
      })
      .catch(err => {
        this.logger.error(`[Honeybadger] Error sending events: ${err.message}`)
      })
  }

  /**
   * todo: improve this
   *
   * The events plugin overrides the console methods to enable automatic instrumentation
   * of console logs to the Honeybadger API.
   * So if we want to log something in here we need to use the original methods.
   */
  private originalLogger() {
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      log: (<any>console.log).__hb_original ?? console.log,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      info: (<any>console.info).__hb_original ?? console.info,
      debug: (...args: unknown[]) => {
        if (!this.config.debug) {
          return
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const func = (<any>console.debug).__hb_original ?? console.debug
        return func(...args)
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      warn: (<any>console.warn).__hb_original ?? console.warn,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: (<any>console.error).__hb_original ?? console.error,
    }
  }
}

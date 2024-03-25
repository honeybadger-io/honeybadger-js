import { Transport, Config, EventsLogger, Logger, EventPayload } from './types'
import { NdJson } from 'json-nd'
import { endpoint } from './util'
import { CONFIG as DEFAULT_CONFIG } from './defaults';

export class ThrottledEventsLogger implements EventsLogger {
  private queue: EventPayload[] = []
  private isProcessing = false
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

    if (!this.isProcessing) {
      this.processQueue()
    }
  }

  private processQueue() {
    if (this.queue.length === 0 || this.isProcessing) {
      return
    }

    this.isProcessing = true
    const eventsData = this.queue.slice()
    this.queue = []

    const data = NdJson.stringify(eventsData)
    this.makeHttpRequest(data)
      .then(() => {
        setTimeout(() => {
          this.isProcessing = false
          this.processQueue()
        }, 50)
      })
      .catch((error) => {
        this.logger.error('[Honeybadger] Error making HTTP request:', error)
        // Continue processing the queue even if there's an error
        setTimeout(() => {
          this.isProcessing = false
          this.processQueue()
        }, 50)
      })
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
      .then(() => {
        if (this.config.debug) {
          this.logger.debug('[Honeybadger] Events sent successfully')
        }
      })
      .catch(err => {
        this.logger.error(`[Honeybadger] Error sending events: ${err.message}`)
      })
  }

  /**
   * todo: improve this
   *
   * The EventsLogger overrides the console methods to enable automatic instrumentation
   * of console logs to the Honeybadger API.
   * So if we want to log something in here we need to use the original methods.
   */
  private originalLogger() {
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      log: (<any>console.log).__hb_original ?? console.log,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      info: (<any>console.info).__hb_original ?? console.info,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      debug: (<any>console.debug).__hb_original ?? console.debug,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      warn: (<any>console.warn).__hb_original ?? console.warn,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: (<any>console.error).__hb_original ?? console.error,
    }
  }
}

import { Transport, Config, EventsWorker, Logger, EventPayload } from './types'
import { NdJson } from 'json-nd'
import { endpoint } from './util'
import { CONFIG as DEFAULT_CONFIG } from './defaults';

export class ThrottledEventsWorker implements EventsWorker {
  private queue: EventPayload[] = []
  private cooldownTimer: ReturnType<typeof setTimeout> | null = null
  // Timestamp (ms) until which the post-send cooldown window is active. A timer
  // is only armed while there are queued events waiting for this window; when the
  // queue drains empty we keep the timestamp but drop the timer, so an idle worker
  // never holds a pending timer (which would otherwise keep a Node process alive
  // for the full interval.
  private cooldownUntil = 0
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

    // Crossing the bulk threshold preempts any pending cooldown and dispatches now.
    if (this.queue.length >= this.bulkThreshold()) {
      this.clearCooldownTimer()
      this.processQueue()
      return
    }

    // A timer is already counting down the cooldown window; the queued event
    // will be picked up when it fires.
    if (this.cooldownTimer) {
      return
    }

    // We're inside a cooldown window but no timer is armed (the queue had drained
    // empty after the previous send). Arm one for the remaining time so this event
    // still respects the interval.
    const remaining = this.cooldownRemainingMs()
    if (remaining > 0) {
      this.scheduleCooldownTimer(remaining)
      return
    }

    this.processQueue()
  }

  flushAsync(): Promise<void> {
    this.logger.debug('[Honeybadger] Flushing events')
    this.clearCooldownTimer()
    const previous = this.inFlight ?? Promise.resolve()
    const flush = previous.then(() => this.drainAll())
    // Mark the flush as in-flight so a concurrent log() doesn't start an
    // overlapping processQueue() drain while we're draining here.
    this.inFlight = flush
    const clear = () => {
      if (this.inFlight === flush) {
        this.inFlight = null
      }
    }
    flush.then(clear, clear)
    return flush
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

    const inFlight = this.send()
      .catch((error) => {
        this.logger.error('[Honeybadger] Error making HTTP request:', error)
      })
      .then(() => {
        // Only reset if we're still the current operation; a flushAsync() may
        // have taken ownership of inFlight while this send was resolving.
        if (this.inFlight === inFlight) {
          this.inFlight = null
          this.scheduleNextDispatch()
        }
      })
    this.inFlight = inFlight
  }

  private scheduleNextDispatch() {
    const intervalMs = this.dispatchIntervalMs()
    // Capture the cooldown deadline at dispatch time so a later config change to
    // the interval doesn't retroactively shorten a window already in progress.
    this.cooldownUntil = Date.now() + intervalMs

    if (this.queue.length >= this.bulkThreshold()) {
      this.processQueue()
      return
    }

    // Only arm a timer when there's queued work waiting for it. If the queue is
    // empty, `cooldownUntil` alone enforces the window: the next log() will arm a
    // timer for whatever time remains, and an idle worker holds no timer at all.
    if (this.queue.length > 0) {
      this.scheduleCooldownTimer(intervalMs)
    }
  }

  private cooldownRemainingMs(): number {
    if (!this.cooldownUntil) {
      return 0
    }
    return Math.max(0, this.cooldownUntil - Date.now())
  }

  private scheduleCooldownTimer(ms: number) {
    this.cooldownTimer = setTimeout(() => {
      this.cooldownTimer = null
      this.processQueue()
    }, ms)
    // In Node, don't let a pending cooldown timer keep the process alive for the
    // whole batching interval. `unref` lets the event loop go idle so the process
    // can exit (or a shutdown / `beforeExit` handler can run) promptly instead of
    // blocking for `dispatchIntervalSeconds`. Queued events aren't lost: a
    // `flushAsync()` on the way out still drains them before exit. (`unref` is
    // Node-only; the browser's numeric setTimeout handle has no such method.)
    if (typeof this.cooldownTimer === 'object' && this.cooldownTimer !== null && typeof this.cooldownTimer.unref === 'function') {
      this.cooldownTimer.unref()
    }
  }

  private clearCooldownTimer() {
    if (this.cooldownTimer) {
      clearTimeout(this.cooldownTimer)
      this.cooldownTimer = null
    }
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
    const v = this.config.events?.bulkThreshold
    return typeof v === 'number' && v > 0 ? v : DEFAULT_CONFIG.events.bulkThreshold
  }

  private dispatchIntervalMs(): number {
    const v = this.config.events?.dispatchIntervalSeconds
    const seconds = typeof v === 'number' && v >= 0 ? v : DEFAULT_CONFIG.events.dispatchIntervalSeconds
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

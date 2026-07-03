import { ThrottledEventsWorker } from '../src/throttled_events_worker';
import { NdJson } from 'json-nd';
import { TestTransport } from './helpers';

async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function makeEvent(name = 'foo') {
  return { event_type: 'event', ts: new Date().toISOString(), name }
}

function fastWorkerConfig(extra: Record<string, unknown> = {}) {
  return {
    debug: true,
    events: {
      dispatchIntervalSeconds: 0.05,
      bulkThreshold: 500,
      sampleRatePercentage: 100,
      ...extra,
    },
  }
}

describe('ThrottledEventsWorker', () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create an instance', () => {
    const eventsWorker = new ThrottledEventsWorker({}, new TestTransport())
    expect(eventsWorker).toBeInstanceOf(ThrottledEventsWorker)
  })

  it('should log event and send to the backend', async () => {
    const consoleLogSpy = jest.spyOn(console, 'debug')
    const transport = new TestTransport()
    const eventsWorker = new ThrottledEventsWorker(fastWorkerConfig(), transport)
    eventsWorker.log(makeEvent())
    await wait(100)
    // @ts-ignore
    expect(eventsWorker.queue.length).toBe(0)
    // @ts-ignore
    expect(eventsWorker.inFlight).toBeNull()
    expect(consoleLogSpy).toHaveBeenCalledWith('[Honeybadger] Events sent successfully')
  })

  it('should batch events that arrive during an in-flight send', async () => {
    const consoleLogSpy = jest.spyOn(console, 'debug')
    const transport = new TestTransport()
    const transportSpy = jest.spyOn(transport, 'send')
    const eventsWorker = new ThrottledEventsWorker(fastWorkerConfig(), transport)
    const event1 = makeEvent('a')
    const event2 = makeEvent('b')
    const event3 = makeEvent('c')
    eventsWorker.log(event1)
    eventsWorker.log(event2)
    eventsWorker.log(event3)
    await wait(300)
    // @ts-ignore
    expect(eventsWorker.queue.length).toBe(0)
    // @ts-ignore
    expect(eventsWorker.inFlight).toBeNull()
    expect(consoleLogSpy).toHaveBeenCalledWith('[Honeybadger] Events sent successfully')
    expect(transportSpy).toHaveBeenCalledTimes(2)
    expect(transportSpy).toHaveBeenNthCalledWith(1, expect.anything(), NdJson.stringify([event1]))
    expect(transportSpy).toHaveBeenNthCalledWith(2, expect.anything(), NdJson.stringify([event2, event3]))
  })

  describe('dispatchIntervalSeconds', () => {
    it('waits the configured interval between batches', async () => {
      const transport = new TestTransport()
      const transportSpy = jest.spyOn(transport, 'send')
      const eventsWorker = new ThrottledEventsWorker(fastWorkerConfig({ dispatchIntervalSeconds: 0.3 }), transport)
      eventsWorker.log(makeEvent('a'))
      await wait(50)
      // First send fires immediately
      expect(transportSpy).toHaveBeenCalledTimes(1)
      eventsWorker.log(makeEvent('b'))
      await wait(100)
      // Still within the 300ms cooldown
      expect(transportSpy).toHaveBeenCalledTimes(1)
      await wait(300)
      expect(transportSpy).toHaveBeenCalledTimes(2)
    })

    it('picks up live config changes', async () => {
      const transport = new TestTransport()
      const transportSpy = jest.spyOn(transport, 'send')
      const eventsWorker = new ThrottledEventsWorker(fastWorkerConfig({ dispatchIntervalSeconds: 10 }), transport)
      eventsWorker.log(makeEvent('a'))
      await wait(50)
      expect(transportSpy).toHaveBeenCalledTimes(1)
      // Lower the interval after the first send while the cooldown is pending.
      // We can't shorten the in-flight cooldown, but the *next* one should use the new value.
      eventsWorker.configure({ events: { dispatchIntervalSeconds: 0.05, bulkThreshold: 500 } as never })
      eventsWorker.log(makeEvent('b'))
      eventsWorker.log(makeEvent('c'))
      // Threshold isn't crossed; the long cooldown set up earlier is still running.
      await wait(300)
      expect(transportSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('bulkThreshold', () => {
    it('preempts the cooldown when the queue crosses the threshold', async () => {
      const transport = new TestTransport()
      const transportSpy = jest.spyOn(transport, 'send')
      const eventsWorker = new ThrottledEventsWorker(fastWorkerConfig({ dispatchIntervalSeconds: 10, bulkThreshold: 5 }), transport)
      eventsWorker.log(makeEvent('a'))
      await wait(50)
      expect(transportSpy).toHaveBeenCalledTimes(1)
      // Now we're in a 10s cooldown. Push enough events to cross the threshold.
      for (let i = 0; i < 5; i++) {
        eventsWorker.log(makeEvent(`burst-${i}`))
      }
      await wait(50)
      // Second send should have fired despite the 10s cooldown.
      expect(transportSpy).toHaveBeenCalledTimes(2)
    })

    it('caps each send at threshold events', async () => {
      const transport = new TestTransport()
      const transportSpy = jest.spyOn(transport, 'send')
      const eventsWorker = new ThrottledEventsWorker(fastWorkerConfig({ dispatchIntervalSeconds: 0.01, bulkThreshold: 3 }), transport)
      for (let i = 0; i < 9; i++) {
        eventsWorker.log(makeEvent(`e-${i}`))
      }
      await wait(300)
      const totalLines = transportSpy.mock.calls.reduce((sum, call) => {
        const body = call[1] as string
        return sum + body.split('\n').filter(Boolean).length
      }, 0)
      expect(totalLines).toBe(9)
      for (const call of transportSpy.mock.calls) {
        const body = call[1] as string
        const lines = body.split('\n').filter(Boolean)
        expect(lines.length).toBeLessThanOrEqual(3)
      }
      // @ts-ignore
      expect(eventsWorker.queue.length).toBe(0)
    })
  })

  describe('flushAsync', () => {
    it('awaits an in-flight send before resolving', async () => {
      const transport = new TestTransport()
      let releaseFirst: (v: { statusCode: number; body: string }) => void = () => undefined
      const firstSend = new Promise<{ statusCode: number; body: string }>((resolve) => {
        releaseFirst = resolve
      })
      const sendSpy = jest.spyOn(transport, 'send').mockImplementationOnce(() => firstSend)

      const eventsWorker = new ThrottledEventsWorker(fastWorkerConfig({ dispatchIntervalSeconds: 0.05 }), transport)
      eventsWorker.log(makeEvent('first'))
      await wait(20)

      let flushed = false
      const flushPromise = eventsWorker.flushAsync().then(() => { flushed = true })

      // Queue another event while the first send is still in flight; it must end up
      // shipped before flushAsync resolves.
      eventsWorker.log(makeEvent('second'))

      await wait(30)
      expect(flushed).toBe(false)

      releaseFirst({ statusCode: 200, body: '' })
      await flushPromise
      expect(flushed).toBe(true)

      // The second event was drained as part of flushAsync.
      expect(sendSpy).toHaveBeenCalledTimes(2)
      // @ts-ignore
      expect(eventsWorker.queue.length).toBe(0)
    })

    it('does not start an overlapping send when log() races an in-flight flush', async () => {
      const transport = new TestTransport()
      let releaseFirst: (v: { statusCode: number; body: string }) => void = () => undefined
      const firstSend = new Promise<{ statusCode: number; body: string }>((resolve) => {
        releaseFirst = resolve
      })
      const sendSpy = jest.spyOn(transport, 'send').mockImplementationOnce(() => firstSend)

      const eventsWorker = new ThrottledEventsWorker(fastWorkerConfig({ dispatchIntervalSeconds: 0.05 }), transport)
      eventsWorker.log(makeEvent('first'))
      await wait(20)
      expect(sendSpy).toHaveBeenCalledTimes(1)

      // Begin a flush while the first send is still in flight, then race more logs in.
      const flushPromise = eventsWorker.flushAsync()
      eventsWorker.log(makeEvent('second'))
      eventsWorker.log(makeEvent('third'))

      await wait(30)
      // No overlapping send: still just the one in-flight request, and the flush
      // keeps inFlight occupied so log()'s processQueue can't drain concurrently.
      expect(sendSpy).toHaveBeenCalledTimes(1)
      // @ts-ignore
      expect(eventsWorker.inFlight).not.toBeNull()

      releaseFirst({ statusCode: 200, body: '' })
      await flushPromise
      // Second/third were drained by the flush in exactly one extra send.
      expect(sendSpy).toHaveBeenCalledTimes(2)
      // @ts-ignore
      expect(eventsWorker.queue.length).toBe(0)
      // @ts-ignore
      expect(eventsWorker.inFlight).toBeNull()
    })

    it('is a no-op when the queue is empty and nothing is in flight', async () => {
      const transport = new TestTransport()
      const sendSpy = jest.spyOn(transport, 'send')
      const eventsWorker = new ThrottledEventsWorker(fastWorkerConfig(), transport)
      await eventsWorker.flushAsync()
      expect(sendSpy).not.toHaveBeenCalled()
    })
  })
})

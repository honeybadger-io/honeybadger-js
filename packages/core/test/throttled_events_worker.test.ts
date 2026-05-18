import { ThrottledEventsWorker } from '../src/throttled_events_worker';
import { NdJson } from 'json-nd';
import { TestTransport } from './helpers';

async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
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
    const eventsWorker = new ThrottledEventsWorker({ debug: true }, transport)
    eventsWorker.log({ event_type: 'event', ts: new Date().toISOString(), name: 'foo' })
    await wait(100)
    // @ts-ignore
    expect(eventsWorker.queue.length).toBe(0)
    // @ts-ignore
    expect(eventsWorker.isProcessing).toBe(false)
    expect(consoleLogSpy).toHaveBeenCalledWith('[Honeybadger] Events sent successfully')
  })

  it('should log multiple events and send the all together to the backend', async () => {
    const consoleLogSpy = jest.spyOn(console, 'debug')
    const transport = new TestTransport()
    const transportSpy = jest.spyOn(transport, 'send')
    const eventsWorker = new ThrottledEventsWorker({ debug: true }, transport)
    const event1 = { event_type: 'event', ts: new Date().toISOString(), name: 'foo' }
    const event2 = { event_type: 'event', ts: new Date().toISOString(), name: 'foo', nested: { value: { play: 1 } } }
    eventsWorker.log(event1)
    eventsWorker.log(event2)
    eventsWorker.log(event1)
    await wait(200)
    // @ts-ignore
    expect(eventsWorker.queue.length).toBe(0)
    // @ts-ignore
    expect(eventsWorker.isProcessing).toBe(false)
    expect(consoleLogSpy).toHaveBeenCalledTimes(2)
    expect(consoleLogSpy).toHaveBeenCalledWith('[Honeybadger] Events sent successfully')
    expect(transportSpy).toHaveBeenCalledTimes(2)
    expect(transportSpy).toHaveBeenNthCalledWith(1, expect.anything(), NdJson.stringify([event1]))
    expect(transportSpy).toHaveBeenNthCalledWith(2, expect.anything(), NdJson.stringify([event2, event1]))
  })

})

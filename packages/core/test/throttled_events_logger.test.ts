import { ThrottledEventsLogger } from '../src/throttled_events_logger';
import { NdJson } from 'json-nd';
import { TestTransport } from './helpers';

async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

describe('ThrottledEventsLogger', () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create an instance', () => {
    const eventsLogger = new ThrottledEventsLogger({}, new TestTransport())
    expect(eventsLogger).toBeInstanceOf(ThrottledEventsLogger)
  })

  it('should log event and send to the backend', async () => {
    const consoleLogSpy = jest.spyOn(console, 'debug')
    const transport = new TestTransport()
    const eventsLogger = new ThrottledEventsLogger({ debug: true }, transport)
    eventsLogger.logEvent({ name: 'foo' })
    await wait(100)
    // @ts-ignore
    expect(eventsLogger.queue.length).toBe(0)
    // @ts-ignore
    expect(eventsLogger.isProcessing).toBe(false)
    expect(consoleLogSpy).toHaveBeenCalledWith('[Honeybadger] Events sent successfully')
  })

  it('should log multiple events and send the all together to the backend', async () => {
    const consoleLogSpy = jest.spyOn(console, 'debug')
    const transport = new TestTransport()
    const transportSpy = jest.spyOn(transport, 'send')
    const eventsLogger = new ThrottledEventsLogger({ debug: true }, transport)
    const event1 = { name: 'foo' }
    const event2 = { name: 'foo', nested: { value: { play: 1 } } }
    eventsLogger.logEvent(event1)
    eventsLogger.logEvent(event2)
    eventsLogger.logEvent(event1)
    await wait(200)
    // @ts-ignore
    expect(eventsLogger.queue.length).toBe(0)
    // @ts-ignore
    expect(eventsLogger.isProcessing).toBe(false)
    expect(consoleLogSpy).toHaveBeenCalledTimes(2)
    expect(consoleLogSpy).toHaveBeenCalledWith('[Honeybadger] Events sent successfully')
    expect(transportSpy).toHaveBeenCalledTimes(2)
    expect(transportSpy).toHaveBeenNthCalledWith(1, expect.anything(), NdJson.stringify([event1]))
    expect(transportSpy).toHaveBeenNthCalledWith(2, expect.anything(), NdJson.stringify([event2, event1]))
  })

})

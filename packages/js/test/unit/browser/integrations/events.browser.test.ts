import { nullLogger, TestClient, TestTransport } from '../../helpers';
import eventsLogger from '../../../../src/browser/integrations/events';

const consoleMocked = () => {
  return {
    log: () => true,
    info: () => true,
    debug: () => true,
    warn: () => true,
    error: () => true
  }
}

describe('window.console integration for events logging', function () {
  let client: TestClient, mockLogEvent, mockConsole

  beforeEach(function () {
    jest.clearAllMocks()
    client = new TestClient({
      logger: nullLogger()
    }, new TestTransport())
    mockLogEvent = jest.fn()
    mockConsole = consoleMocked()
    client.logEvent = mockLogEvent
  })

  it('should skip install by default', function () {
    const window = { console: mockConsole }
    eventsLogger(<never>window).load(client)
    expect(client.config.eventsEnabled).toEqual(false)
    expect(window.console.log).toEqual(mockConsole.log)
  })

  it('should skip install if console is not available', function () {
    client.config.eventsEnabled = true
    const window = {}
    eventsLogger(<never>window).load(client)
    expect(window['console']).toBeUndefined()
  })

  it('should send events to Honeybadger', async function () {
    client.config.eventsEnabled = true
    const window = { console: mockConsole }
    eventsLogger(<never>window).load(client)
    mockConsole.log('testing')
    expect(mockLogEvent.mock.calls.length).toBe(1)
  })
})

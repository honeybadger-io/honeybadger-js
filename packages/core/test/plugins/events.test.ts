import { nullLogger, TestClient, TestTransport } from '../helpers'
import eventsLogger from '../../src/plugins/events'

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
  let client: TestClient, mockConsole

  beforeEach(function () {
    jest.clearAllMocks()
    client = new TestClient({
      logger: nullLogger()
    }, new TestTransport())
    mockConsole = consoleMocked()
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
    const eventsLoggerSpy = jest.spyOn(client.eventsLogger(), 'log')
    client.config.eventsEnabled = true
    const window = { console: mockConsole }
    eventsLogger(<never>window).load(client)
    mockConsole.log('testing')
    expect(eventsLoggerSpy).toHaveBeenCalledWith({
      event_type: 'log',
      ts: expect.any(String),
      severity: 'log',
      message: 'testing',
      args: []
    })
  })
})

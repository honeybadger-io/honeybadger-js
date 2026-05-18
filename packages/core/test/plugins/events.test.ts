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

  function enableConsoleInsights() {
    client.config.eventsEnabled = true
    client.config.insights = { enabled: true, console: true }
  }

  it('should skip install by default', function () {
    const window = { console: mockConsole }
    eventsLogger(<never>window).load(client)
    expect(client.config.eventsEnabled).toEqual(false)
    expect(window.console.log).toEqual(mockConsole.log)
  })

  it('should skip install when eventsEnabled is true but insights.console is false', function () {
    client.config.eventsEnabled = true
    const window = { console: mockConsole }
    eventsLogger(<never>window).load(client)
    expect(window.console.log).toEqual(mockConsole.log)
  })

  it('should skip install when insights.enabled is false even if insights.console is true', function () {
    client.config.eventsEnabled = true
    client.config.insights = { enabled: false, console: true }
    const window = { console: mockConsole }
    eventsLogger(<never>window).load(client)
    expect(window.console.log).toEqual(mockConsole.log)
  })

  it('should skip install if console is not available', function () {
    enableConsoleInsights()
    const window = {}
    eventsLogger(<never>window).load(client)
    expect(window['console']).toBeUndefined()
  })

  it('should send events to Honeybadger', async function () {
    const workerLogSpy = jest.spyOn(client.eventsWorker(), 'log')
    enableConsoleInsights()
    const window = { console: mockConsole }
    eventsLogger(<never>window).load(client)
    mockConsole.log('testing')
    // client.event() runs beforeEvent handlers async, so flush microtasks before asserting.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(workerLogSpy).toHaveBeenCalledWith({
      event_type: 'log',
      ts: expect.any(String),
      severity: 'log',
      message: 'testing',
      args: []
    })
  })
})

import { nullLogger, TestClient, TestTransport } from '../helpers'
import eventsLogger from '../../src/plugins/console_events'

const consoleMocked = () => {
  return {
    log: () => true,
    info: () => true,
    debug: () => true,
    warn: () => true,
    error: () => true
  }
}

type MockConsole = Record<string, (...args: unknown[]) => unknown>

describe('window.console integration for events logging', function () {
  let client: TestClient, mockConsole

  beforeEach(function () {
    jest.clearAllMocks()
    client = new TestClient({
      apiKey: 'testing',
      logger: nullLogger()
    }, new TestTransport())
    mockConsole = consoleMocked()
  })

  function enableConsoleInsights() {
    client.config.insights = { enabled: true, console: true }
  }

  it('should skip install by default', function () {
    const window = { console: mockConsole }
    eventsLogger(<never>window).load(client)
    expect(client.config.insights.enabled).toEqual(false)
    expect(window.console.log).toEqual(mockConsole.log)
  })

  it('should skip install when insights.enabled is true but insights.console is false', function () {
    client.config.insights = { enabled: true, console: false }
    const window = { console: mockConsole }
    eventsLogger(<never>window).load(client)
    expect(window.console.log).toEqual(mockConsole.log)
  })

  it('should skip install when insights.enabled is false even if insights.console is true', function () {
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

  describe('when reporting is disabled', function () {
    // instrumentConsole() wraps a console only once per module instance, so load
    // fresh copies of the client and plugin to make sure this console is wrapped.
    function loadIsolated(config: Record<string, unknown>) {
      let isolatedClient: TestClient
      const isolatedConsole: MockConsole = consoleMocked()
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const helpers = require('../helpers')
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const plugin = require('../../src/plugins/console_events').default
        isolatedClient = new helpers.TestClient({
          apiKey: 'testing',
          insights: { enabled: true, console: true },
          ...config,
        }, new helpers.TestTransport())
        plugin(<never>{ console: isolatedConsole }).load(isolatedClient)
      })
      return { isolatedClient, isolatedConsole }
    }

    it('does not send console events when reportData is false', async function () {
      const { isolatedClient, isolatedConsole } = loadIsolated({ reportData: false, logger: nullLogger() })
      const eventSpy = jest.spyOn(isolatedClient, 'event')
      const workerLogSpy = jest.spyOn(isolatedClient.eventsWorker(), 'log')
      isolatedConsole.log('testing')
      await new Promise((resolve) => setTimeout(resolve, 0))
      // The console really is instrumented: the call reached event()...
      expect(eventSpy).toHaveBeenCalledTimes(1)
      // ...which dropped it.
      expect(workerLogSpy).not.toHaveBeenCalled()
    })

    it.each([
      ['reportData is false', { reportData: false }],
      ['no API key is configured', { apiKey: null }],
    ])('does not loop through the instrumented console logger when %s and debug is on', function (_label, config) {
      // The SDK logger writes to the same console that is instrumented. If the
      // skip diagnostic went through it, each diagnostic would become another
      // event() call, which logs another diagnostic, until the stack overflows.
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => undefined)
      const holder: { console?: MockConsole } = {}
      const instrumentedLogger = {
        log: (...args: unknown[]) => holder.console.log(...args),
        info: (...args: unknown[]) => holder.console.info(...args),
        debug: (...args: unknown[]) => holder.console.debug(...args),
        warn: (...args: unknown[]) => holder.console.warn(...args),
        error: (...args: unknown[]) => holder.console.error(...args),
      }
      const { isolatedClient, isolatedConsole } = loadIsolated({ debug: true, logger: instrumentedLogger, ...config })
      holder.console = isolatedConsole
      const eventSpy = jest.spyOn(isolatedClient, 'event')

      expect(() => isolatedConsole.log('testing')).not.toThrow()
      expect(eventSpy).toHaveBeenCalledTimes(1)
      expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('skipping event'))
      debugSpy.mockRestore()
    })
  })
})

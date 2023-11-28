import { nullLogger, TestClient, TestTransport } from '../../helpers';
import eventsLogger from '../../../../src/browser/integrations/events';

describe('window.console integration for events logging', function () {
  let client: TestClient, mockLogEvent

  beforeEach(function () {
    jest.clearAllMocks()
    client = new TestClient({
      logger: nullLogger()
    }, new TestTransport())
    mockLogEvent = jest.fn()
    client.logEvent = mockLogEvent
  })

  it('skips install by default', function () {
    const window = { console }
    eventsLogger(<never>window).load(client)
    expect(client.config.eventsEnabled).toEqual(false)
    expect(window.console.log).toEqual(console.log)
  })

  it('skips install if console is not available', function () {
    client.config.eventsEnabled = true
    const window = {}
    eventsLogger(<never>window).load(client)
    expect(window['console']).toBeUndefined()
  })

  it('overrides console methods', function () {
    client.config.eventsEnabled = true
    const window = { console };
    ['log', 'info', 'debug', 'warn', 'error'].forEach((method) => {
      expect(console[method]).not.toHaveProperty('__hb_original')
    })
    eventsLogger(<never>window).load(client);
    ['log', 'info', 'debug', 'warn', 'error'].forEach((method) => {
      expect(console[method]).toHaveProperty('__hb_original')
    })
  })

  it('sends events to Honeybadger', async function () {
    client.config.eventsEnabled = true
    const window = { console }
    eventsLogger(<never>window).load(client)
    console.log('testing')
    expect(mockLogEvent.mock.calls.length).toBe(1)
  })
})

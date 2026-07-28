import plugin from '../../../../src/server/integrations/shutdown_plugin'
import { TestTransport, TestClient, nullLogger } from '../../helpers'
import * as util from '../../../../src/server/util'
import Singleton from '../../../../src/server'

describe('Shutdown Plugin', () => {
  let client: typeof Singleton
  let flushSpy: jest.SpyInstance

  beforeEach(() => {
    // We just need a really basic client, so ignoring type issues here
    client = new TestClient(
      { apiKey: 'testKey', afterUncaught: jest.fn(), logger: nullLogger() },
      new TestTransport()
    ) as unknown as typeof Singleton
    // Have to mock fatallyLogAndExitGracefully or we will crash the test
    jest
      .spyOn(util, 'fatallyLogAndExitGracefully')
      .mockImplementation(() => true as never)
    flushSpy = jest.spyOn(client, 'flushAsync')
  })

  afterEach(() => {
    jest.clearAllMocks()
    process.removeAllListeners('SIGINT')
    process.removeAllListeners('SIGTERM')
  })

  it('is a function which returns an object with a load function', () => {
    expect(plugin()).toStrictEqual({
      load: expect.any(Function),
      shouldReloadOnConfigure: true,
    })
  })

  describe('load', () => {
    const load = plugin().load

    it('attaches a listener for SIGTERM', () => {
      load(client)
      const listeners = process.listeners('SIGTERM')
      expect(listeners).toHaveLength(1)
      expect(listeners[0].name).toBe('honeybadgerShutdownListener')
      process.emit('SIGTERM', 'SIGTERM')
      expect(flushSpy).toHaveBeenCalledTimes(1)
    })

    it('attaches a listener for SIGINT', () => {
      load(client)
      const listeners = process.listeners('SIGINT')
      expect(listeners).toHaveLength(1)
      expect(listeners[0].name).toBe('honeybadgerShutdownListener')
      process.emit('SIGINT', 'SIGINT')
      expect(flushSpy).toHaveBeenCalledTimes(1)
    })

    it('attaches the listener even when eventsEnabled is false (programmatic events are never gated)', () => {
      client.configure({ eventsEnabled: false })
      load(client)
      expect(process.listeners('SIGINT')).toHaveLength(1)
      expect(process.listeners('SIGTERM')).toHaveLength(1)
    })

    it('does not add duplicate listeners when reloaded', () => {
      load(client)
      expect(process.listeners('SIGINT')).toHaveLength(1)
      expect(process.listeners('SIGTERM')).toHaveLength(1)

      client.configure({})
      load(client)
      expect(process.listeners('SIGINT')).toHaveLength(1)
      expect(process.listeners('SIGTERM')).toHaveLength(1)
    })
  })
})

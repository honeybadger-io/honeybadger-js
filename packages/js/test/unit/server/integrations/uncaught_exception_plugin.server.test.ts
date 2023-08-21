import plugin from '../../../../src/server/integrations/uncaught_exception_plugin'
import { TestTransport, TestClient, nullLogger } from '../../helpers'
import * as util from '../../../../src/server/util'
import Singleton from '../../../../src/server'

describe('Uncaught Exception Plugin', () => {
  let client: typeof Singleton
  let notifySpy: jest.SpyInstance

  beforeEach(() => {
    // We just need a really basic client, so ignoring type issues here
    client = new TestClient(
      { apiKey: 'testKey', afterUncaught: jest.fn(), logger: nullLogger() }, 
      new TestTransport()
    ) as unknown as typeof Singleton
    // Have to mock fatallyLogAndExit or we will crash the test
    jest
      .spyOn(util, 'fatallyLogAndExit')
      .mockImplementation(() => true as never)
    notifySpy = jest.spyOn(client, 'notify')
  })

  afterEach(() => {
    jest.clearAllMocks()
    process.removeAllListeners('uncaughtException')
  })

  it('is a function which returns an object with a load function', () => {
    expect(plugin()).toStrictEqual({
      load: expect.any(Function)
    })
  })

  describe('load', () => {
    const load = plugin().load

    it('attaches a listener for uncaughtException', () => {
      load(client)
      const listeners = process.listeners('uncaughtException')
      expect(listeners.length).toBe(1)
      expect(listeners[0].name).toBe('bound honeybadgerUncaughtExceptionListener') 

      const error = new Error('uncaught')
      process.emit('uncaughtException', error)
      expect(notifySpy).toHaveBeenCalledTimes(1)
    })

    it('returns if enableUncaught is not true', () => {
      client.configure({ enableUncaught: false })
      load(client)
      const listeners = process.listeners('uncaughtException')
      expect(listeners.length).toBe(0)
    })
  })  
})

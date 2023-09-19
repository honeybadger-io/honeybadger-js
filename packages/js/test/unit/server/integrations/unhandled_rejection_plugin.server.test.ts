import plugin from '../../../../src/server/integrations/unhandled_rejection_plugin'
import { TestTransport, TestClient, nullLogger } from '../../helpers'
import * as util from '../../../../src/server/util'
import Singleton from '../../../../src/server'

function getListeners() {
  return process.listeners('unhandledRejection')
}

function getListenerCount() {
  return getListeners().length
}

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
    process.removeAllListeners('unhandledRejection')
  })

  it('is a function which returns an object with a load function', () => {
    expect(plugin()).toStrictEqual({
      load: expect.any(Function), 
      shouldReloadOnConfigure: true,
    })
  })

  describe('load', () => {
    const load = plugin().load

    it('attaches a listener for unhandledRejection if enableUnhandledRejection is true', () => {
      load(client)
      const listeners = getListeners()
      expect(listeners.length).toBe(1)
      expect(listeners[0].name).toBe('honeybadgerUnhandledRejectionListener') 

      const promise = new Promise(() => true)
      process.emit('unhandledRejection', 'Stuff went wrong', promise)
      expect(notifySpy).toHaveBeenCalledTimes(1)
    })

    it('does not add a listener if enableUnhandledRejection is false', () => {
      client.configure({ enableUnhandledRejection: false })
      load(client)
      expect(getListenerCount()).toBe(0)
    })

    it('adds or removes listener if needed when reloaded', () => {
      load(client)
      expect(getListenerCount()).toBe(1)
      
      client.configure({ enableUnhandledRejection: false })
      load(client)
      expect(getListenerCount()).toBe(0)
      
      client.configure({ enableUnhandledRejection: true })
      load(client)
      expect(getListenerCount()).toBe(1)
    })
  })  
})

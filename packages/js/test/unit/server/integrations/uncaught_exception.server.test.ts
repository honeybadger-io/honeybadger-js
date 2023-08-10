import defaultExport, { exportedForTesting } from '../../../../src/server/integrations/uncaught_exception'
import { TestTransport, TestClient } from '../../helpers'
import { Honeybadger } from '../../../../src/server'
import * as util from '../../../../src/server/util'
const { 
  handleUncaughtException, 
  setIsReporting,
  setHandlerAlreadyCalled,
} = exportedForTesting

describe('uncaught exceptions', () => {
  let client: Honeybadger

  beforeEach(() => {
    // For these tests a simplified client is enough.. so ignoring type errors for it
    client = new TestClient({}, new TestTransport()) as unknown as Honeybadger
    client.configure()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('default export', () => {
    it('is a function which returns an object with a load function', () => {
      expect(defaultExport()).toStrictEqual({
        load: expect.any(Function)
      })
    })

    describe('load', () => {
      const load = defaultExport().load

      it('adds a listener for uncaughtException', () => {
        load(client)
        const listeners = process.listeners('uncaughtException')
        expect(listeners.length).toBe(1)
        expect(listeners[0].name).toBe('honeybadgerUncaughtExceptionListener')
      })
    })
    
  })

  describe('handleUncaughtException', () => {
    
    const error = new Error('dang, broken again')
    let fatallyLogAndExitSpy: jest.SpyInstance
    let notifySpy: jest.SpyInstance

    beforeEach(() => {      
      // Have to mock fatallyLogAndExit or we will crash the test
      fatallyLogAndExitSpy = jest
        .spyOn(util, 'fatallyLogAndExit')
        .mockImplementation(() => true as never)
      notifySpy = jest.spyOn(client, 'notify')
    })

    

    it('calls client.notify(), afterUncaught, and fatallyLogAndExit', () => {
      handleUncaughtException(error, client)
      expect(notifySpy).toHaveBeenCalledTimes(1)
      expect(notifySpy).toHaveBeenCalledWith(
        error, 
        { afterNotify: expect.any(Function) }
      )
      expect(fatallyLogAndExitSpy).toHaveBeenCalled()
    })

    it('returns if it is already reporting', () => {
      setIsReporting(true)
      handleUncaughtException(error, client)
      expect(notifySpy).not.toHaveBeenCalled()
      expect(fatallyLogAndExitSpy).not.toHaveBeenCalled()
      setIsReporting(false)
    })

    it('returns if it was already called and there are other listeners', () => {
      setHandlerAlreadyCalled(true)
      process.on('uncaughtException', () => true)
      process.on('uncaughtException', () => true)

      handleUncaughtException(error, client)
      expect(notifySpy).not.toHaveBeenCalled()
      expect(fatallyLogAndExitSpy).not.toHaveBeenCalled()

      setHandlerAlreadyCalled(false)
      process.removeAllListeners('uncaughtException')
    })

    it('exits if it was already called and there are no other listeners', () => {
      setHandlerAlreadyCalled(true)

      handleUncaughtException(error, client)
      expect(notifySpy).not.toHaveBeenCalled()
      expect(fatallyLogAndExitSpy).toHaveBeenCalled()

      setHandlerAlreadyCalled(false)
    })
  })
})

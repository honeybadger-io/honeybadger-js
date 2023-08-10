import defaultExport, { exportedForTesting } from '../../../../src/server/integrations/uncaught_exception'
import { TestTransport, TestClient } from '../../helpers'
import { Honeybadger } from '../../../../src/server'
import * as util from '../../../../src/server/util'
import * as aws from '../../../../src/server/aws_lambda'
const { 
  handleUncaughtException, 
  setIsReporting,
  setHandlerAlreadyCalled,
} = exportedForTesting

describe('uncaught exceptions', () => {
  let client: Honeybadger
  let fatallyLogAndExitSpy: jest.SpyInstance
  let notifySpy: jest.SpyInstance

  beforeEach(() => {
    // For these tests a simplified client is enough, so ignoring type errors for it
    client = new TestClient({}, new TestTransport()) as unknown as Honeybadger
    client.configure({ apiKey: 'testKey', afterUncaught: jest.fn() })
    // Have to mock fatallyLogAndExit or we will crash the test
    fatallyLogAndExitSpy = jest
      .spyOn(util, 'fatallyLogAndExit')
      .mockImplementation(() => true as never)
    notifySpy = jest.spyOn(client, 'notify')
  })

  afterEach(() => {
    jest.clearAllMocks()
    process.removeAllListeners('uncaughtException')
    setIsReporting(false)
    setHandlerAlreadyCalled(false)
  })

  describe('default export plugin', () => {
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

        const error = new Error('uncaught')
        process.emit('uncaughtException', error)
        expect(notifySpy).toHaveBeenCalledTimes(1)
      })

      it('removes the AWS lambda uncaught exception listener', () => {
        const restoreEnv = process.env
        process.env.LAMBDA_TASK_ROOT = 'foobar'
        const removeLambdaSpy = jest
          .spyOn(aws, 'removeAwsDefaultUncaughtExceptionListener')

        load(client)
        expect(removeLambdaSpy).toHaveBeenCalledTimes(1)
        const listeners = process.listeners('uncaughtException')
        expect(listeners.length).toBe(1)
        expect(listeners[0].name).toBe('honeybadgerUncaughtExceptionListener') 

        process.env = restoreEnv
      })

      it('returns if enableUncaught is not true', () => {
        client.configure({ enableUncaught: false })
        load(client)
        const listeners = process.listeners('uncaughtException')
        expect(listeners.length).toBe(0)
      })
    })  
  })

  describe('handleUncaughtException', () => {   
    const error = new Error('dang, broken again')  

    it('calls notify, afterUncaught, and fatallyLogAndExit', (done) => {
      handleUncaughtException(error, client)
      expect(notifySpy).toHaveBeenCalledTimes(1)
      expect(notifySpy).toHaveBeenCalledWith(
        error, 
        { afterNotify: expect.any(Function) }
      )
      client.afterNotify(() => {
        expect(client.config.afterUncaught).toHaveBeenCalledWith(error)
        expect(fatallyLogAndExitSpy).toHaveBeenCalledWith(error)
        done()
      }) 
    })

    it('returns if it is already reporting', () => {
      setIsReporting(true)
      handleUncaughtException(error, client)
      expect(notifySpy).not.toHaveBeenCalled()
      expect(fatallyLogAndExitSpy).not.toHaveBeenCalled()
    })

    it('returns if it was already called and there are other listeners', () => {
      setHandlerAlreadyCalled(true)
      process.on('uncaughtException', () => true)
      process.on('uncaughtException', () => true)
      handleUncaughtException(error, client)
      expect(notifySpy).not.toHaveBeenCalled()
      expect(fatallyLogAndExitSpy).not.toHaveBeenCalled()
    })

    it('exits if it was already called and there are no other listeners', () => {
      setHandlerAlreadyCalled(true)
      handleUncaughtException(error, client)
      expect(notifySpy).not.toHaveBeenCalled()
      expect(fatallyLogAndExitSpy).toHaveBeenCalledWith(error)
    })
  })
})

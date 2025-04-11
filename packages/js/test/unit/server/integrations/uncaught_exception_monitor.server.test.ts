import { TestTransport, TestClient, nullLogger } from '../../helpers'
import * as util from '../../../../src/server/util'
import Singleton from '../../../../src/server'
import UncaughtExceptionMonitor from '../../../../src/server/integrations/uncaught_exception_monitor'
import * as aws from '../../../../src/server/aws_lambda'

function getListenerCount() {
  return process.listeners('uncaughtException').length
}

describe('UncaughtExceptionMonitor', () => {
  // Using any rather than the real type so we can test and spy on private methods
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  let uncaughtExceptionMonitor: any
  let client: typeof Singleton
  let fatallyLogAndExitSpy: jest.SpyInstance
  let notifySpy: jest.SpyInstance

  beforeEach(() => {
    // We just need a really basic client, so ignoring type issues here
    client = new TestClient(
      { apiKey: 'testKey', afterUncaught: jest.fn(), logger: nullLogger() },
      new TestTransport()
    ) as unknown as typeof Singleton
    uncaughtExceptionMonitor = new UncaughtExceptionMonitor()
    uncaughtExceptionMonitor.setClient(client)
    // Have to mock fatallyLogAndExit or we will crash the test
    fatallyLogAndExitSpy = jest
      .spyOn(util, 'fatallyLogAndExit')
      .mockImplementation(() => true as never)
    notifySpy = jest.spyOn(client, 'notify')
  })

  afterEach(() => {
    jest.clearAllMocks()
    process.removeAllListeners('uncaughtException')
    uncaughtExceptionMonitor.__isReporting = false
    uncaughtExceptionMonitor.__handlerAlreadyCalled = false
  })

  describe('constructor', () => {
    it('sets variables and removes the AWS lambda uncaught exception listener', () => {
      const restoreEnv = { ...process.env }
      process.env.LAMBDA_TASK_ROOT = 'foobar'
      const removeLambdaSpy = jest
        .spyOn(aws, 'removeAwsDefaultUncaughtExceptionListener')

      // Using any rather than the real type so we can test and spy on private methods
      // eslint-disable-next-line  @typescript-eslint/no-explicit-any
      const newMonitor = new UncaughtExceptionMonitor() as any
      expect(removeLambdaSpy).toHaveBeenCalledTimes(1)
      expect(newMonitor.__isReporting).toBe(false)
      expect(newMonitor.__handlerAlreadyCalled).toBe(false)
      expect(newMonitor.__listener).toStrictEqual(expect.any(Function))
      expect(newMonitor.__listener.name).toBe('honeybadgerUncaughtExceptionListener')

      process.env = restoreEnv
    })
  })

  describe('maybeAddListener', () => {
    it('adds our listener a maximum of one time', () => {
      expect(getListenerCount()).toBe(0)
      // Adds our listener
      uncaughtExceptionMonitor.maybeAddListener()
      expect(getListenerCount()).toBe(1)
      // Doesn't add a duplicate
      uncaughtExceptionMonitor.maybeAddListener()
      expect(getListenerCount()).toBe(1)
    })
  })

  describe('maybeRemoveListener', () => {
    it('removes our listener if it is present', () => {
      uncaughtExceptionMonitor.maybeAddListener()
      process.on('uncaughtException', (err) => { console.log(err) })
      expect(getListenerCount()).toBe(2)

      uncaughtExceptionMonitor.maybeRemoveListener()
      expect(getListenerCount()).toBe(1)
    })

    it('does nothing if our listener is not present', () => {
      process.on('uncaughtException', (err) => { console.log(err) })
      expect(getListenerCount()).toBe(1)

      uncaughtExceptionMonitor.maybeRemoveListener()
      expect(getListenerCount()).toBe(1)
    })
  })

  describe('__listener', () => {
    const error = new Error('dang, broken again')

    it('calls notify, afterUncaught, and fatallyLogAndExit', (done) => {
      uncaughtExceptionMonitor.__listener(error)
      expect(notifySpy).toHaveBeenCalledTimes(1)
      expect(notifySpy).toHaveBeenCalledWith(
        error,
        { afterNotify: expect.any(Function) }
      )
      client.afterNotify(() => {
        expect(client.config.afterUncaught).toHaveBeenCalledWith(error)
        expect(fatallyLogAndExitSpy).toHaveBeenCalledWith(error, 'uncaught exception')
        done()
      })
    })

    it('returns if it is already reporting', () => {
      uncaughtExceptionMonitor.__isReporting = true
      uncaughtExceptionMonitor.__listener(error)
      expect(notifySpy).not.toHaveBeenCalled()
      expect(fatallyLogAndExitSpy).not.toHaveBeenCalled()
    })

    it('returns if it was already called and there are other listeners', () => {
      process.on('uncaughtException', () => true)
      process.on('uncaughtException', () => true)
      uncaughtExceptionMonitor.__listener(error)
      expect(notifySpy).toHaveBeenCalledTimes(1)

      client.afterNotify(() => {
        expect(fatallyLogAndExitSpy).not.toHaveBeenCalled()
        expect(uncaughtExceptionMonitor.__handlerAlreadyCalled).toBe(true)
        // Doesn't notify a second time
        uncaughtExceptionMonitor.__listener(error)
        expect(notifySpy).toHaveBeenCalledTimes(1)
      })
    })

    it('exits if it was already called and there are no other listeners', () => {
      uncaughtExceptionMonitor.__handlerAlreadyCalled = true
      uncaughtExceptionMonitor.__listener(error)
      expect(notifySpy).not.toHaveBeenCalled()
      expect(fatallyLogAndExitSpy).toHaveBeenCalledWith(error, 'uncaught exception')
    })
  })

  describe('hasOtherUncaughtExceptionListeners', () => {
    it('returns true if there are user-added listeners', () => {
      uncaughtExceptionMonitor.maybeAddListener()
      process.on('uncaughtException', function domainUncaughtExceptionClear() {
        return
      })
      process.on('uncaughtException', function userAddedListener() {
        return
      })
      expect(uncaughtExceptionMonitor.hasOtherUncaughtExceptionListeners()).toBe(true)
    })

    it('returns false if there are only our expected listeners', () => {
      uncaughtExceptionMonitor.maybeAddListener()
      process.on('uncaughtException', function domainUncaughtExceptionClear() {
        return
      })
      expect(uncaughtExceptionMonitor.hasOtherUncaughtExceptionListeners()).toBe(false)
    })
  })
})

import { TestTransport, TestClient, nullLogger } from '../../helpers'
import * as util from '../../../../src/server/util'
import Singleton from '../../../../src/server'
import UnhandledRejectionMonitor from '../../../../src/server/integrations/unhandled_rejection_monitor'

function getListenerCount() {
  return process.listeners('unhandledRejection').length
}

describe('UnhandledRejectionMonitor', () => {
  // Using any rather than the real type so we can test and spy on private methods
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  let unhandledRejectionMonitor: any
  let client: typeof Singleton
  let fatallyLogAndExitSpy: jest.SpyInstance
  let notifySpy: jest.SpyInstance

  beforeEach(() => {
    // We just need a really basic client, so ignoring type issues here
    client = new TestClient(
      { apiKey: 'testKey', afterUncaught: jest.fn(), logger: nullLogger() }, 
      new TestTransport()
    ) as unknown as typeof Singleton
    unhandledRejectionMonitor = new UnhandledRejectionMonitor()
    unhandledRejectionMonitor.setClient(client)
    // Have to mock fatallyLogAndExit or we will crash the test
    fatallyLogAndExitSpy = jest
      .spyOn(util, 'fatallyLogAndExit')
      .mockImplementation(() => true as never)
    notifySpy = jest.spyOn(client, 'notify')
  })

  afterEach(() => {
    jest.clearAllMocks()
    process.removeAllListeners('unhandledRejection')
    unhandledRejectionMonitor.__isReporting = false
  })

  describe('constructor', () => {
    it('set up variables and client', () => {
      expect(unhandledRejectionMonitor.__isReporting).toBe(false)
      expect(unhandledRejectionMonitor.__listener).toStrictEqual(expect.any(Function))
      expect(unhandledRejectionMonitor.__listener.name).toBe('honeybadgerUnhandledRejectionListener')
    })
  })

  describe('maybeAddListener', () => {
    it('adds our listener a maximum of one time', () => {
      expect(getListenerCount()).toBe(0)
      // Adds our listener
      unhandledRejectionMonitor.maybeAddListener()
      expect(getListenerCount()).toBe(1)
      // Doesn't add a duplicate
      unhandledRejectionMonitor.maybeAddListener()
      expect(getListenerCount()).toBe(1)
    })
  })

  describe('maybeRemoveListener', () => {
    it('removes our listener if it is present', () => {
      unhandledRejectionMonitor.maybeAddListener()
      process.on('unhandledRejection', (err) => { console.log(err) })
      expect(getListenerCount()).toBe(2)

      unhandledRejectionMonitor.maybeRemoveListener()
      expect(getListenerCount()).toBe(1)
    })

    it('does nothing if our listener is not present', () => {
      process.on('unhandledRejection', (err) => { console.log(err) })
      expect(getListenerCount()).toBe(1)
      
      unhandledRejectionMonitor.maybeRemoveListener()
      expect(getListenerCount()).toBe(1)
    })
  })

  describe('__listener', () => {   
    const promise = new Promise(() => true)
    const reason = 'Promise rejection reason'

    it('calls notify and fatallyLogAndExit', (done) => {   
      unhandledRejectionMonitor.__listener(reason, promise)
      expect(notifySpy).toHaveBeenCalledTimes(1)
      expect(notifySpy).toHaveBeenCalledWith(
        reason, 
        { component: 'unhandledRejection' },
        { afterNotify: expect.any(Function) }
      )
      client.afterNotify(() => {
        expect(fatallyLogAndExitSpy).toHaveBeenCalledWith(reason)
        done()
      }) 
    })

    it('exits if enableUnhandledRejection is false and there are no other listeners', () => {
      client.configure({ enableUnhandledRejection: false })
      unhandledRejectionMonitor.__listener(reason, promise)
      expect(notifySpy).not.toHaveBeenCalled()
      expect(fatallyLogAndExitSpy).toHaveBeenCalledWith(reason)
    })

    it('returns if enableUnhandledRejection is false and there are other listeners', () => {
      process.on('unhandledRejection', () => true)
      process.on('unhandledRejection', () => true)
      client.configure({ enableUnhandledRejection: false })
      unhandledRejectionMonitor.__listener(reason, promise)
      expect(notifySpy).not.toHaveBeenCalled()
      expect(fatallyLogAndExitSpy).not.toHaveBeenCalled()
    })
  })

  describe('hasOtherUnhandledRejectionListeners', () => {
    it('returns true if there are user-added listeners', () => {
      unhandledRejectionMonitor.maybeAddListener()
      process.on('unhandledRejection', function userAddedListener() {
        return
      })
      expect(unhandledRejectionMonitor.hasOtherUnhandledRejectionListeners()).toBe(true)
    })

    it('returns false if there is only our expected listener', () => {
      unhandledRejectionMonitor.maybeAddListener()
      expect(unhandledRejectionMonitor.hasOtherUnhandledRejectionListeners()).toBe(false)
    })
  })
})

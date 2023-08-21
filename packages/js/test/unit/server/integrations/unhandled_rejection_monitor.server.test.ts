import { TestTransport, TestClient, nullLogger } from '../../helpers'
import * as util from '../../../../src/server/util'
import Singleton from '../../../../src/server'
import UnhandledRejectionMonitor from '../../../../src/server/integrations/unhandled_rejection_monitor'


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
    unhandledRejectionMonitor = new UnhandledRejectionMonitor(client)
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
      expect(unhandledRejectionMonitor.__client.config.apiKey).toBe('testKey')
    })
  })

  describe('handleUnhandledRejection', () => {   
    const promise = new Promise(() => true)
    const reason = 'Promise rejection reason'

    it('calls notify and fatallyLogAndExit', (done) => {   
      unhandledRejectionMonitor.handleUnhandledRejection(reason, promise)
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
      unhandledRejectionMonitor.handleUnhandledRejection(reason, promise)
      expect(notifySpy).not.toHaveBeenCalled()
      expect(fatallyLogAndExitSpy).toHaveBeenCalledWith(reason)
    })

    it('returns if enableUnhandledRejection is false and there are other listeners', () => {
      process.on('unhandledRejection', () => true)
      process.on('unhandledRejection', () => true)
      client.configure({ enableUnhandledRejection: false })
      unhandledRejectionMonitor.handleUnhandledRejection(reason, promise)
      expect(notifySpy).not.toHaveBeenCalled()
      expect(fatallyLogAndExitSpy).not.toHaveBeenCalled()
    })
  })
})

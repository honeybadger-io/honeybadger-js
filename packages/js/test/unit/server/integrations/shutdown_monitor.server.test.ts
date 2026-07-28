import { TestTransport, TestClient, nullLogger } from '../../helpers'
import * as util from '../../../../src/server/util'
import Singleton from '../../../../src/server'
import ShutdownMonitor from '../../../../src/server/integrations/shutdown_monitor'

describe('ShutdownMonitor', () => {
  // Using any rather than the real type so we can test and spy on private methods
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  let shutdownMonitor: any
  let client: typeof Singleton
  let fatallyLogAndExitGracefullySpy: jest.SpyInstance
  let flushSpy: jest.SpyInstance

  beforeEach(() => {
    // We just need a really basic client, so ignoring type issues here
    client = new TestClient(
      { apiKey: 'testKey', afterUncaught: jest.fn(), logger: nullLogger() },
      new TestTransport()
    ) as unknown as typeof Singleton
    shutdownMonitor = new ShutdownMonitor()
    shutdownMonitor.setClient(client)
    // Have to mock fatallyLogAndExit or we will crash the test
    fatallyLogAndExitGracefullySpy = jest
      .spyOn(util, 'fatallyLogAndExitGracefully')
      .mockImplementation(() => true as never)
    flushSpy = jest.spyOn(client, 'flushAsync')
  })

  afterEach(() => {
    jest.clearAllMocks()
    process.removeAllListeners('SIGTERM')
    process.removeAllListeners('SIGINT')
    // Remove only our beforeExit listener; the test runner may register its own.
    process.removeListener('beforeExit', shutdownMonitor.__beforeExitListener)
    shutdownMonitor.__isReporting = false
    shutdownMonitor.__handlerAlreadyCalled = false
  })

  describe('constructor', () => {
    it('sets variables', () => {
      // Using any rather than the real type so we can test and spy on private methods
      // eslint-disable-next-line  @typescript-eslint/no-explicit-any
      const newMonitor = new ShutdownMonitor() as any
      expect(newMonitor.__isReporting).toBe(false)
      expect(newMonitor.__listener).toStrictEqual(expect.any(Function))
      expect(newMonitor.__listener.name).toBe('honeybadgerShutdownListener')
      expect(newMonitor.__beforeExitListener).toStrictEqual(expect.any(Function))
      expect(newMonitor.__beforeExitListener.name).toBe('honeybadgerBeforeExitListener')
    })
  })

  // Other listeners (e.g. the test runner's) may already be registered on
  // beforeExit, so assert on the presence of *our* listener rather than a count.
  const ourBeforeExitCount = () =>
    process.listeners('beforeExit').filter(l => l === shutdownMonitor.__beforeExitListener).length

  describe('maybeAddListener', () => {
    it('adds our listener a maximum of one time', () => {
      expect(process.listeners('SIGINT')).toHaveLength(0)
      expect(process.listeners('SIGTERM')).toHaveLength(0)
      expect(ourBeforeExitCount()).toBe(0)

      // Adds our listener
      shutdownMonitor.maybeAddListener()
      expect(process.listeners('SIGINT')).toHaveLength(1)
      expect(process.listeners('SIGTERM')).toHaveLength(1)
      expect(ourBeforeExitCount()).toBe(1)

      // Doesn't add a duplicate
      shutdownMonitor.maybeAddListener()
      expect(process.listeners('SIGINT')).toHaveLength(1)
      expect(process.listeners('SIGTERM')).toHaveLength(1)
      expect(ourBeforeExitCount()).toBe(1)
    })
  })

  describe('maybeRemoveListener', () => {
    it('removes our listener if it is present', () => {
      shutdownMonitor.maybeAddListener()
      process.on('SIGINT', (signal) => { console.log(signal) })
      process.on('SIGTERM', (signal) => { console.log(signal) })
      expect(process.listeners('SIGINT')).toHaveLength(2)
      expect(process.listeners('SIGTERM')).toHaveLength(2)
      expect(ourBeforeExitCount()).toBe(1)

      shutdownMonitor.maybeRemoveListener()
      expect(process.listeners('SIGINT')).toHaveLength(1)
      expect(process.listeners('SIGTERM')).toHaveLength(1)
      expect(ourBeforeExitCount()).toBe(0)
    })

    it('does nothing if our listener is not present', () => {
      process.on('SIGINT', (signal) => { console.log(signal) })
      process.on('SIGTERM', (signal) => { console.log(signal) })
      expect(process.listeners('SIGINT')).toHaveLength(1)
      expect(process.listeners('SIGTERM')).toHaveLength(1)

      shutdownMonitor.maybeRemoveListener()
      expect(process.listeners('SIGINT')).toHaveLength(1)
      expect(process.listeners('SIGTERM')).toHaveLength(1)
    })
  })

  describe('__listener', () => {
    it('calls flushAsync and fatallyLogAndExitGracefully', (done) => {
      shutdownMonitor.__listener('SIGINT')
      expect(flushSpy).toHaveBeenCalledTimes(1)
      setTimeout(() => {
        expect(fatallyLogAndExitGracefullySpy).toHaveBeenCalledWith('SIGINT')
        done()
      }, 10)
    })

    it('returns if it is already reporting', () => {
      shutdownMonitor.__isReporting = true
      shutdownMonitor.__listener('SIGINT')
      expect(flushSpy).not.toHaveBeenCalled()
      expect(fatallyLogAndExitGracefullySpy).not.toHaveBeenCalled()
    })
  })

  describe('__beforeExitListener', () => {
    it('flushes queued events without forcing the process to exit', async () => {
      await shutdownMonitor.__beforeExitListener()
      expect(flushSpy).toHaveBeenCalledTimes(1)
      // Natural exit: we must not force-exit the way the signal handler does.
      expect(fatallyLogAndExitGracefullySpy).not.toHaveBeenCalled()
      expect(shutdownMonitor.__isReporting).toBe(false)
    })

    it('returns if it is already reporting (so the flush I/O does not re-trigger it)', async () => {
      shutdownMonitor.__isReporting = true
      await shutdownMonitor.__beforeExitListener()
      expect(flushSpy).not.toHaveBeenCalled()
    })
  })

  describe('hasOtherShutdownListeners', () => {
    it('returns true if there are user-added listeners', () => {
      shutdownMonitor.maybeAddListener()
      process.on('SIGINT', function userAddedListener() {
        return
      })
      expect(shutdownMonitor.hasOtherShutdownListeners('SIGINT')).toBe(true)
    })

    it('returns false if there are only our expected listeners', () => {
      shutdownMonitor.maybeAddListener()
      expect(shutdownMonitor.hasOtherShutdownListeners('SIGINT')).toBe(false)
    })
  })
})

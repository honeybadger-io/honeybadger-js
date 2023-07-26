import Honeybadger from '../src/index'
import fetch from 'jest-fetch-mock'
import { NativeEventEmitter, NativeModules, Platform } from 'react-native'
import { Transport } from '../src/transport'
import { AfterNotifyHandler, NoticeTransportPayload } from '@honeybadger-io/core/build/src/types'

describe('react native client', () => {
  // Using any rather than the real type so we can test and spy on
  // private methods
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  let client: any
  const config = {
    apiKey: 'testApiKey',
    environment: 'testEnvironment',
    revision: 'testRevision',
    logger: {
      error: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
    }
  }

  beforeAll(() => {
    fetch.enableMocks()
  })

  beforeEach(() => {
    // Mock our custom native module
    NativeModules.HoneybadgerReactNative = {
      start: jest.fn(),
      addListener: jest.fn(),
      removeListeners: jest.fn(),
    }

    // Version is a number on android, string on ios
    Platform.OS = 'android'
    jest.spyOn(Platform, 'Version', 'get').mockReturnValue(30)

    client = Honeybadger.factory(config)
  })

  afterEach(() => {
    jest.resetAllMocks()
    fetch.resetMocks()
  })

  describe('constructor', () => {
    it('calls super with options and transport', () => {
      expect(client.__jsHandlerInitialized).toBe(false)
      expect(client.__nativeHandlerInitialized).toBe(false)
      expect(client.__transport).toBeInstanceOf(Transport)
      expect(client.config.apiKey).toBe(config.apiKey)
    })

    it('sets context with basic platorm info', () => {
      const context = client.__store.getContents('context')
      expect(context.platform).toStrictEqual({
        os: 'android',
        version: 30,
      })
    })
  })

  describe('configure', () => {
    it('sets error handlers and calls super', () => {
      jest.spyOn(client, 'setJavascriptErrorHandler')
      jest.spyOn(client, 'setNativeExceptionHandler')
      client.configure(config)

      expect(client.setJavascriptErrorHandler).toHaveBeenCalled()
      expect(client.__jsHandlerInitialized).toBe(true)

      expect(client.setNativeExceptionHandler).toHaveBeenCalled()
      expect(client.__nativeHandlerInitialized).toBe(true)

      expect(client.config.apiKey).toBe(config.apiKey)
      expect(client.config.environment).toBe(config.environment)
    })

    it('sets the environment if none is set', () => {
      client.configure({ apiKey: 'testApiKey' })
      expect(client.config.apiKey).toBe(config.apiKey)
      expect(client.config.environment).toBe('development')
    })
  })

  describe('checkIn', () => {
    it('throws an error since it is not implemented', () => {
      expect(client.checkIn).toThrowError('Honeybadger.checkIn() is not yet supported on react-native')
    })
  })

  describe('showUserFeedbackForm', () => {
    it('throws an error since it is not implemented', () => {
      expect(client.showUserFeedbackForm).toThrowError('Honeybadger.showUserFeedbackForm() is not yet supported on react-native')
    })
  })

  describe('setJavascriptErrorHandler', () => {
    it('only runs once', () => {
      jest.spyOn(ErrorUtils, 'setGlobalHandler')
      client.__jsHandlerInitialized = true
      client.setJavascriptErrorHandler()

      expect(ErrorUtils.setGlobalHandler).not.toHaveBeenCalled()
    })

    it('sets the global error handler and records __jsHandlerInitialized', () => {
      const setGlobalHandlerSpy = jest.spyOn(ErrorUtils, 'setGlobalHandler')
      const onJavascriptErrorSpy = jest.spyOn(client, 'onJavascriptError').mockReturnValue(undefined)
      client.setJavascriptErrorHandler()

      expect(setGlobalHandlerSpy).toHaveBeenCalledTimes(1)
      expect(client.__jsHandlerInitialized).toBe(true)
      expect(client.__originalJsHandler).toBeInstanceOf(Function)

      // Check that the global handler was set correctly
      const customHandler = ErrorUtils.getGlobalHandler()
      const err = new Error('testing')
      customHandler(err, false)
      expect(onJavascriptErrorSpy).toHaveBeenCalledTimes(1)
      expect(onJavascriptErrorSpy).toHaveBeenLastCalledWith(err, false, true)
    })
  })

  describe('onJavascriptError', () => {
    it('calls notify() and doesn\'t pass to the original handler in prod', () => {
      fetch.mockResponse(JSON.stringify({ id: 'testUuid' }), { status: 201 })
      jest.spyOn(client, 'notify')
      client.__originalJsHandler = jest.fn()

      const err = new Error('whoops')
      client.onJavascriptError(err, false, false)

      expect(client.notify).toHaveBeenCalledTimes(1)
      expect(client.notify).toHaveBeenCalledWith(err)
      expect(client.__originalJsHandler).not.toHaveBeenCalled()
    })

    it('calls notify() and passes to the original handler in dev', () => {
      fetch.mockResponse(JSON.stringify({ id: 'testUuid' }), { status: 201 })
      jest.spyOn(client, 'notify')
      client.__originalJsHandler = jest.fn()

      const err = new Error('whoops')
      const fatal = true
      client.onJavascriptError(err, fatal, true)

      expect(client.notify).toHaveBeenCalledTimes(1)
      expect(client.notify).toHaveBeenCalledWith(err)
      expect(client.__originalJsHandler).toHaveBeenCalledTimes(1)
      expect(client.__originalJsHandler).toHaveBeenCalledWith(err, fatal)
    })
  })

  describe('setNativeExceptionHandler', () => {
    it('only runs once', () => {
      client.__nativeHandlerInitialized = true
      client.setNativeExceptionHandler()

      expect(NativeModules.HoneybadgerReactNative.start).not.toHaveBeenCalled()
    })

    it('logs an error if the native module is not found', () => {
      NativeModules.HoneybadgerReactNative = undefined
      client.setNativeExceptionHandler()

      expect(client.__nativeHandlerInitialized).toBe(false)
      expect(config.logger.error).toHaveBeenCalledWith(
        '[Honeybadger]',
        'The native module was not found. Please review the installation instructions.'
      )
    })

    it('starts the native module and adds a listener for native exceptions', () => {
      jest.spyOn(client, 'onNativeException')
      client.setNativeExceptionHandler()

      // Check that the listener was set up by emitting an event
      const emitter = new NativeEventEmitter()
      const data = { hello: 'world' }
      emitter.emit('native-exception-event', data)

      expect(NativeModules.HoneybadgerReactNative.start).toHaveBeenCalledTimes(1)
      expect(client.__nativeHandlerInitialized).toBe(true)
      expect(client.onNativeException).toHaveBeenCalledWith(data)
    })
  })

  describe('onNativeException', () => {
    const data = { testing: '123' }
    beforeEach(() => {
      jest.spyOn(client, 'onNativeIOSException')
      jest.spyOn(client, 'onNativeAndroidException')
    })

    it('passes ios errors to the appropriate handler', () => {
      Platform.OS = 'ios'
      client.onNativeException(data)

      expect(client.onNativeIOSException).toHaveBeenCalledWith(data)
      expect(client.onNativeAndroidException).not.toHaveBeenCalled()
    })

    it('passes android errors to the appropriate handler', () => {
      Platform.OS = 'android'
      client.onNativeException(data)

      expect(client.onNativeIOSException).not.toHaveBeenCalled()
      expect(client.onNativeAndroidException).toHaveBeenCalledWith(data)
    })
  })

  describe('onNativeIOSException', () => {
    // Note: Decided not to mock out iosUtils here
    it('formats a notice and calls notify', () => {
      const data = {
        'reason' : 'Testing native iOS exception',
        'architecture' : 'x86_64h',
        'initialHandler' : 'RCTSetFatalExceptionHandler',
        'reactNativeStackTrace' : [],
        'type' : 'Exception',
        'callStackSymbols' : [
          '0 CoreFoundation 0x00007ff8004288ab __exceptionPreprocess + 242',
          '1 libobjc.A.dylib 0x00007ff80004dba3 objc_exception_throw + 48',
        ],
        'name' : 'Sample_iOS_Exception',
        'userInfo' : {}
      }
      jest.spyOn(client, 'notify')

      client.onNativeIOSException(data)
      expect(client.notify).toHaveBeenCalledWith({
        name: 'React Native iOS Exception',
        message: 'Sample_iOS_Exception : Testing native iOS exception',
        backtrace: [
          {
            file: 'CoreFoundation',
            line: '',
            method: '__exceptionPreprocess',
            stack_address: '0x00007ff8004288ab',
          },
          {
            file: 'libobjc.A.dylib',
            line: '',
            method: 'objc_exception_throw',
            stack_address: '0x00007ff80004dba3',
          }
        ],
        details: {
          errorDomain: '',
          initialHandler: 'RCTSetFatalExceptionHandler',
          userInfo: {},
          architecture: 'x86_64h',
          primaryBackTraceSource: 'iOSCallStack',
        }
      })
    })

    describe('onNativeAndroidException', () => {
      // Note: Decided not to mock out androidUtils here
      it('formats a notice and calls notify', () => {
        const data = {
          stackTrace: [
            {
              line: 30,
              class: 'com.awesomeproject.ThrowErrModule$1',
              method: 'run',
              file: 'ThrowErrModule.java'
            },
          ],
          message: 'Test Delayed Exception',
          type: 'Exception'
        }
        jest.spyOn(client, 'notify')

        client.onNativeAndroidException(data)

        expect(client.notify).toHaveBeenCalledWith({
          name: 'React Native Android Exception',
          message: 'Test Delayed Exception',
          backtrace: [
            {
              method: 'com.awesomeproject.ThrowErrModule$1.run',
              file: 'ThrowErrModule.java',
              number: 30,
            },
          ]
        })
      })
    })

    describe('parent Client class', () => {
      it('beforeNotify works as in parent', () => {
        client.config.breadcrumbsEnabled = false
        const beforeNotifyHandler = jest.fn()
        const err = new Error('whoops')

        client.beforeNotify(beforeNotifyHandler)
        client.onJavascriptError(err, false, false)

        expect(client.__beforeNotifyHandlers.length).toBe(1)
        expect(beforeNotifyHandler).toHaveBeenCalledTimes(1)
        const expectedNotice = {
          ...client.makeNotice(err),
          __breadcrumbs: []
        }
        const receivedNotice = beforeNotifyHandler.mock.calls[0][0]
        expect(receivedNotice).toStrictEqual(expectedNotice)
        expect(receivedNotice.message).toBe('whoops')
      })

      it('afterNotify works as in parent', async () => {
        const id = 'testWithBeforeAfterNotify'

        fetch.mockResponse(JSON.stringify({ id }), { status: 201 })
        const err = new Error('whoops')

        return new Promise<void>(resolve => {
          const afterNotifyHandler: AfterNotifyHandler = (error, notice) => {
            expect(error).toBe(undefined)
            expect(notice.id).toBe(id)
            resolve()
          }
          client.afterNotify(afterNotifyHandler)
          client.onJavascriptError(err, false, false)
        })
      })

      it('addBreadcrumb works as in parent', async () => {
        client.config.breadcrumbsEnabled = true
        const err = new Error('whoops')
        const sendSpy = jest.spyOn(client.__transport, 'send')
        fetch.mockResponse(JSON.stringify({ id: 'foo' }), { status: 201 })

        client.addBreadcrumb('sourdough', { category: 'bread crumb' })
        expect(client.__getBreadcrumbs()[0].category).toEqual('bread crumb')

        return new Promise<void>(resolve => {
          const afterNotifyHandler: AfterNotifyHandler = () => {
            const payloadSent = sendSpy.mock.lastCall[1] as NoticeTransportPayload
            const crumbsSent = payloadSent.breadcrumbs.trail.map(({ category, message }) => ({ category, message }))
            expect(crumbsSent).toStrictEqual([
              { category: 'bread crumb', message: 'sourdough' },
              { category: 'notice', message: 'Honeybadger Notice' },
            ])
            resolve()
          }
          client.afterNotify(afterNotifyHandler)
          client.onJavascriptError(err, false, false)
        })
      })

      it('setContext works as in parent', async () => {
        const err = new Error('whoops')
        const sendSpy = jest.spyOn(client.__transport, 'send')
        fetch.mockResponse(JSON.stringify({ id: 'foo' }), { status: 201 })

        client.setContext({ key: 'value' })
        expect(client.__getContext().key).toEqual('value')

        return new Promise<void>(resolve => {
          const afterNotifyHandler: AfterNotifyHandler = () => {
            const payloadSent = sendSpy.mock.lastCall[1] as NoticeTransportPayload
            const contextSent = payloadSent.request.context
            expect(contextSent).toStrictEqual({
              key: 'value',
              platform: { os: 'android', version: 30 }
            })
            resolve()
          }
          client.afterNotify(afterNotifyHandler)
          client.onJavascriptError(err, false, false)
        })
      })
    })
  })

  describe('notifier', () => {
    it('instance has the correct notifier name', () => {
      const notifier = client.getNotifier()
      expect(notifier.name).toEqual('@honeybadger-io/react-native')
    })

    it('payload has the correct notifier name', () => {
      fetch.mockResponse(JSON.stringify({ id: 'testUuid' }), { status: 201 })
      const err = new Error('whoops')

      return new Promise<void>(resolve => {
        const afterNotifyHandler: AfterNotifyHandler = (error, _notice) => {
          expect(error).toBe(undefined)

          // @ts-expect-error
          const payload = JSON.parse(fetch.mock.lastCall[1].body)
          expect(payload.notifier.name).toEqual('@honeybadger-io/react-native')

          resolve()
        }
        client.afterNotify(afterNotifyHandler)
        client.onJavascriptError(err, false, false)
      })
    })
  })
})

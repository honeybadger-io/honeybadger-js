import Honeybadger from '../src/index'
import fetch from 'jest-fetch-mock'
import { NativeModules, Platform } from 'react-native'
import { Transport } from '../src/transport'

describe.only('react native client', () => {
  // Using any rather than the real type so we can test and spy on 
  // private methods
  let client: any
  const config = {
    apiKey: 'testApiKey',
    environment: 'testEnvironment',
    revision: 'testRevision',
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
})
import { Transport } from '../src/transport'
import fetch from 'jest-fetch-mock'
import { NoticeTransportPayload } from '@honeybadger-io/core/build/src/types'
import * as pkg from '../package.json'

describe('Transport', () => {
  
  beforeAll(() => {
    fetch.enableMocks()
  })

  describe('send', () => {
    let transport: Transport
    const endpoint = 'https://my.amazing.test'
    const reqBody = { outgoing: 'yeah' } as unknown as NoticeTransportPayload
    const resBody = { incoming: true }

    beforeEach(() => {
      fetch.resetMocks()
      transport = new Transport()
      jest.mock(
        'react-native/Libraries/Utilities/Platform',
        () => ({
          OS: 'android',
          constants: {
            reactNativeVersion: {
              major: 0, 
              minor: 71, 
              patch: 12,
            }
          }
        })
      )
    })

    it('sends GET request and resolves with response code and body', async () => {
      fetch.mockResponseOnce(JSON.stringify(resBody), { status: 200 })
  
      const res = await transport.send({
        method: 'GET',
        endpoint,
        logger: console
      })
  
      // Check request
      expect(fetch.mock.calls.length).toBe(1)
      const [endpointCalledWith, paramsCalledWith] = fetch.mock.lastCall
      expect(endpointCalledWith).toBe(endpoint)
      expect(paramsCalledWith.method).toBe('GET')
      expect(paramsCalledWith.body).toBeUndefined()
  
      // Check response
      expect(res.statusCode).toEqual(200)
      expect(JSON.parse(res.body)).toEqual(resBody)
    })
  
    it('sends POST request with body and headers', async () => {
      const headers = {
        'X-API-Key': '123',
        'Content-Type': 'application/json;charset=utf-8',
        Accept: 'text/json, application/json'
      }
      fetch.mockResponseOnce(JSON.stringify(resBody), { status: 201 })
  
      const res = await transport.send({
        method: 'POST',
        endpoint,
        logger: console, 
        headers,
      }, reqBody )
  
      // Check request
      expect(fetch.mock.calls.length).toBe(1)
      const [endpointCalledWith, paramsCalledWith] = fetch.mock.lastCall
      expect(endpointCalledWith).toBe(endpoint)
      expect(paramsCalledWith.method).toBe('POST')
      expect(paramsCalledWith.headers).toStrictEqual({
        ...headers, 
        'User-Agent': `${pkg.name} ${pkg.version}; 0.71.12; Android`,
      })
      expect(paramsCalledWith.body).toBe(JSON.stringify({
        ...reqBody, 
        notifier: {
          name: pkg.name, 
          url: pkg.repository.url, 
          version: pkg.version,
        }
      }))
  
      // Check response
      expect(res.statusCode).toEqual(201)
      expect(JSON.parse(res.body)).toEqual(resBody)
    })
  })
})

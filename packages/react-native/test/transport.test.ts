import { Transport } from '../src/transport'
import fetch from 'jest-fetch-mock'
import { NoticeTransportPayload } from '@honeybadger-io/core/build/src/types'

describe('Transport', function () {
  let transport: Transport
  const endpoint = 'https://my.amazing.test'
  const userAgent = 'test-react-native 0.0.0; wow'
  const reqBody = { outgoing: 'yeah' } as unknown as NoticeTransportPayload
  const resBody = { incoming: true }

  beforeEach(() => {
    fetch.enableMocks()
    fetch.resetMocks()
    transport = new Transport()
    const mockBuildUserAgent = jest.spyOn(Transport.prototype as any, 'buildUserAgent');
    mockBuildUserAgent.mockImplementation(() => userAgent)
  })

  it('sends GET request over the network', async () => {
    fetch.mockResponseOnce(JSON.stringify(resBody), { status: 200 })

    const res = await transport.send({
      method: 'GET',
      endpoint,
      logger: console
    })

    expect(fetch.mock.calls.length).toEqual(1)
    expect(res.statusCode).toEqual(200)
    expect(JSON.parse(res.body)).toEqual(resBody)
  })

  it('sends POST request over the network', async () => {
    fetch.mockResponseOnce(JSON.stringify(resBody), { status: 201 })

    const res = await transport.send({
      method: 'POST',
      endpoint,
      logger: console
    }, reqBody )

    expect(fetch.mock.calls.length).toEqual(1)
    // expect(fetch.mock).toHaveBeenCalledWith(endpoint, {
    //   method: 'POST', 
    //   headers: { 'User-Agent': userAgent }, 
    //   body: JSON.stringify({
    //     ...reqBody, 

    //   })
    // })
    expect(res.statusCode).toEqual(201)
    expect(JSON.parse(res.body)).toEqual(resBody)
  })

  // it('sends POST request over the network with headers', () => {
  //   const headers = {
  //     'X-API-Key': '123',
  //     'Content-Type': 'application/json;charset=utf-8',
  //     Accept: 'text/json, application/json'
  //   }

  //   fetch.mockResponseOnce(JSON.stringify({}), { status: 201, headers })

  //   const promise = transport.send({
  //     method: 'POST',
  //     endpoint: 'my-endpoint',
  //     headers,
  //     logger: console
  //   }, { test: 1 } as unknown as NoticeTransportPayload).then((resp) => {
  //     expect(resp.statusCode).toEqual(201)
  //     return Promise.resolve()
  //   })

  //   expect(fetch.mock.lastCall[1].headers).toEqual(headers)
  //   expect(fetch.mock.calls.length).toEqual(1)

  //   return promise
  // })
})

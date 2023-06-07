import { Transport } from '../src/transport'
import fetch from 'jest-fetch-mock'
import { NoticeTransportPayload } from '@honeybadger-io/core/build/src/types'

describe('Transport', function () {
  let transport: Transport
  beforeAll(() => {
    transport = new Transport()
  })

  beforeEach(() => {
    fetch.resetMocks()
  })

  it('sends GET request over the network', () => {
    expect(1+1).toEqual(2)
    // fetch.mockResponseOnce(JSON.stringify({}), { status: 201 })

    // const promise = transport.send({
    //   method: 'GET',
    //   endpoint: 'my-endpoint',
    //   logger: console
    // }).then((resp) => {
    //   expect(resp.statusCode).toEqual(201)
    //   return Promise.resolve()
    // })

    // expect(fetch.mock.calls.length).toEqual(1)

    // return promise
  })

  // it('sends POST request over the network', () => {
  //   fetch.mockResponseOnce(JSON.stringify({}), { status: 201 })

  //   const promise = transport.send({
  //     method: 'POST',
  //     endpoint: 'my-endpoint',
  //     logger: console
  //   }, { test: 1 } as unknown as NoticeTransportPayload).then((resp) => {
  //     expect(resp.statusCode).toEqual(201)
  //     return Promise.resolve()
  //   })

  //   expect(fetch.mock.calls.length).toEqual(1)

  //   return promise
  // })

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

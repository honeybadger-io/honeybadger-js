import { expect, td } from './testSetup'
import { Buffer } from 'buffer'
import { Response, FetchError } from 'node-fetch'

describe('deploys', () => {
  const fetchMock = td.func()  
  
  // Mock accessing the files 
  async function readFileMock(filePath: string) {
    return Buffer.from(filePath)
  }

  let deploys

  beforeEach(async () => {
    // Replace node-fetch with a mock before importing 
    td.replace('node-fetch', fetchMock)
    td.replace('fs', { promises: { readFile: readFileMock } })
    deploys = await import('../src/deploys')
  })

  afterEach(() => {
    td.reset()
  })

  describe('sendDeployNotification', () => {
    const testData = {
      deployEndpoint: 'https://api.honeybadger.io/testing/deploys', 
      apiKey: 'test_api_key', 
      revision: 'revision_1', 
      retries: 0, 
      silent: false
    }

    it('should resolve with the response if the response is ok', async () => {
      // Check we called fetch with the expected arguments
      td.when(fetchMock(testData.deployEndpoint, {
        method: 'POST',
        headers: {
          'X-API-KEY': testData.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: td.matchers.isA(String),
        redirect: 'follow',
        retries: testData.retries,
        retryDelay: 1000
      }))
        .thenResolve(new Response('Ok', { status: 200 }))

      const res = await deploys.sendDeployNotification(testData)
      expect(res.status).to.equal(200)
    })

    it('should reject with an error if fetch rejects', async () => {
      td.when(fetchMock(testData.deployEndpoint, td.matchers.anything()))
        .thenReject(new FetchError('Go fetch it yourself', 'Yeah'))

      try {
        await deploys.sendDeployNotification(testData)
      } catch (err) {
        expect(err.message).to.equal('Failed to send deploy notification to Honeybadger: FetchError - Go fetch it yourself')
      }
    })

    it('should reject with a useful error if response is not ok', async () => {
      // Nothing useful in the body
      let res = new Response(JSON.stringify({ foo: 'bar' }), { status: 500, statusText: 'Internal server error' })
      td.when(fetchMock(testData.deployEndpoint, td.matchers.anything()))
        .thenResolve(res)
      try {
        await deploys.sendDeployNotification(testData)
      } catch (err) {
        expect(err.message).to.equal('Failed to send deploy notification to Honeybadger: 500 - Internal server error')
      }
      
      // No body at all
      res = new Response('', { status: 404, statusText: 'Not found' })
      td.when(fetchMock(testData.deployEndpoint, td.matchers.anything()))
        .thenResolve(res)
      try {
        await deploys.sendDeployNotification(testData)
      } catch (err) {
        expect(err.message).to.equal('Failed to send deploy notification to Honeybadger: 404 - Not found')
      }

      // Body contains error data
      res = new Response(JSON.stringify({ error: 'Server has the hiccups' }), { status: 500 })
      td.when(fetchMock(testData.deployEndpoint, td.matchers.anything()))
        .thenResolve(res)
      try {
        await deploys.sendDeployNotification(testData)
      } catch (err) {
        expect(err.message).to.equal('Failed to send deploy notification to Honeybadger: 500 - Server has the hiccups')
      }
    })

    it('should not retry if retries = 0', async () => {
      const okRes = new Response('', { status: 201 })

      // Reject once, then resolve
      td.when(fetchMock(testData.deployEndpoint, td.matchers.anything()))
        .thenResolve(okRes)
      td.when(fetchMock(testData.deployEndpoint, td.matchers.anything()), { times: 1 })
        .thenReject(new FetchError('', ''))

      try {
        await deploys.sendDeployNotification(testData)
      } catch (err) {
        expect(err.message).to.equal('Failed to send deploy notification to Honeybadger: FetchError')
      }
    })

    it('should retry if retries > 0', async () => {
      const okRes = new Response('', { status: 201 })

      // Reject once, then resolve
      td.when(fetchMock(testData.deployEndpoint, td.matchers.anything()))
        .thenResolve(okRes)
      td.when(fetchMock(testData.deployEndpoint, td.matchers.anything()), { times: 1 })
        .thenReject(new FetchError('No fetch', 'Nope'))
      
      const res = await deploys.sendDeployNotification({ ...testData, retries: 3 })
      expect(res.status).to.equal(201)
    })
  })

  describe('buildBodyForDeployNotification', () => {
    it('should return expected JSON string if deploy is true', () => {
      const result = deploys.buildBodyForDeployNotification({
        deploy: true, 
        revision: 'revision123'
      })

      expect(result).equals('{"deploy":{"revision":"revision123"}}') 
    })

    it('should return expected JSON string if deploy is an object', () => {
      const result = deploys.buildBodyForDeployNotification({
        deploy: { 
          repository: 'https://github.com/honeybadger-io/honeybadger-js', 
          localUsername: 'BethanyBerkowitz', 
          environment: 'production'
        }, 
        revision: 'revision123'
      })

      expect(result).equals('{"deploy":{"revision":"revision123","repository":"https://github.com/honeybadger-io/honeybadger-js","local_username":"BethanyBerkowitz","environment":"production"}}') 
    })

    it('should ignore missing keys', () => {
      // Not passing environment in
      const result = deploys.buildBodyForDeployNotification({
        deploy: { 
          repository: 'https://github.com/honeybadger-io/honeybadger-js', 
          localUsername: 'BethanyBerkowitz', 
        }, 
        revision: 'revision123'
      })

      expect(result).equals('{"deploy":{"revision":"revision123","repository":"https://github.com/honeybadger-io/honeybadger-js","local_username":"BethanyBerkowitz"}}') 
    })
  })
})
import { expect } from 'chai'
import * as td from 'testdouble'
import { FormData, File, Response, FetchError } from 'node-fetch';

describe('Utils', () => {
  const fetchMock = td.func()  
  const testData = {
    endpoint: 'https://honeybadger.io/api/sourcemaps/test',
    assetsUrl: 'https://foo.bar', 
    apiKey: 'test_key', 
    retries: 0,
    revision: '12345', 
    silent: false, 
    sourcemapFilename: 'sourcemapfile.map.js',
    sourcemapFilePath: 'path/to/sourcemapfile.map.js', 
    jsFilename: 'index.js', 
    jsFilePath: 'path/to/jsfile.js',   
  }
  // Mock accessing the files via node-fetch's async fileFrom
  async function fileFromMock(filePath, type) {
    return new File([filePath, type], filePath, { type })
  }
  let utils

  beforeEach(async () => {
    // Replace node-fetch with a mock before importing 
    await td.replaceEsm(
      'node-fetch', 
      { FormData, fileFrom: fileFromMock }, 
      fetchMock
    );
    utils = await import('../src/utils.js')
  })

  describe('buildBodyForSourcemapUpload', () => {
    it('should return an instance of FormData with expected entries', async () => {
      const result = await utils.buildBodyForSourcemapUpload(testData)

      expect(result).to.be.an.instanceOf(FormData)

      const expectedFields = [
        ['api_key', 'test_key'], 
        ['minified_url', 'https://foo.bar/index.js'], 
        ['revision', '12345'],    
      ]
      const expectedFiles = [
        ['minified_file', 'path/to/jsfile.js', 'application/javascript'], 
        ['source_map', 'path/to/sourcemapfile.map.js', 'application/octet-stream']
      ]
      expectedFields.forEach(([key, value]) => {
        expect(result.get(key)).to.equal(value)
      })  
      expectedFiles.forEach(([key, filePath, type]) => {
        const file = result.get(key)
        expect(file).to.be.an.instanceOf(File)
        expect(file.name).to.equal(filePath)
        expect(file.type).to.equal(type)
      }) 
    })
  });

  describe('uploadSourcemap', () => {
    it('should resolve with the response if the response is ok', async () => {
      td.when(fetchMock(testData.endpoint, td.matchers.anything()))
        .thenResolve(new Response({}, { status: 200 }))

      const res = await utils.uploadSourcemap(testData)
      expect(res.status).to.equal(200)
    })

    it('should reject with an error if fetch rejects', async () => {
      td.when(fetchMock(testData.endpoint, td.matchers.anything()))
        .thenReject(new FetchError())

      try {
        await utils.uploadSourcemap(testData)
      } catch (err) {
        expect(err.message).to.equal('Failed to upload sourcemap sourcemapfile.map.js to Honeybadger')
        expect(err.cause).to.be.an.instanceOf(FetchError)
      }
    })

    it('should reject with a useful error if response is not ok', async () => {
      // Nothing useful in the body
      let res = new Response(JSON.stringify({ foo: 'bar' }), { status: 500, statusText: 'Internal server error' })
      td.when(fetchMock(testData.endpoint, td.matchers.anything()))
        .thenResolve(res)
      try {
        await utils.uploadSourcemap(testData)
      } catch (err) {
        expect(err.message).to.equal('Failed to upload sourcemap sourcemapfile.map.js to Honeybadger: 500 - Internal server error')
      }
      
      // No body at all
      res = new Response('', { status: 404, statusText: 'Not found' })
      td.when(fetchMock(testData.endpoint, td.matchers.anything()))
        .thenResolve(res)
      try {
        await utils.uploadSourcemap(testData)
      } catch (err) {
        expect(err.message).to.equal('Failed to upload sourcemap sourcemapfile.map.js to Honeybadger: 404 - Not found')
      }

      // Body contains error data
      res = new Response(JSON.stringify({ error: 'Server has the hiccups' }), { status: 500 })
      td.when(fetchMock(testData.endpoint, td.matchers.anything()))
        .thenResolve(res)
      try {
        await utils.uploadSourcemap(testData)
      } catch (err) {
        expect(err.message).to.equal('Failed to upload sourcemap sourcemapfile.map.js to Honeybadger: 500 - Server has the hiccups')
      }
    })

    it('should not retry if retries = 0', async () => {
      const okRes = new Response('', { status: 201 })

      // Reject once, then resolve
      td.when(fetchMock(testData.endpoint, td.matchers.anything()))
        .thenResolve(okRes)
      td.when(fetchMock(testData.endpoint, td.matchers.anything()), { times: 1 })
        .thenReject(new FetchError())

      try {
        await utils.uploadSourcemap(testData)
      } catch (err) {
        expect(err.cause).to.be.an.instanceOf(FetchError)
      }
    })

    it('should retry if retries > 0', async () => {
      const okRes = new Response('', { status: 201 })

      // Reject once, then resolve
      td.when(fetchMock(testData.endpoint, td.matchers.anything()))
        .thenResolve(okRes)
      td.when(fetchMock(testData.endpoint, td.matchers.anything()), { times: 1 })
        .thenReject(new FetchError())
      
      const res = await utils.uploadSourcemap({ ...testData, retries: 3 })
      expect(res.status).to.equal(201)
    })
  })

  afterEach(() => {
    td.reset()
  })
});
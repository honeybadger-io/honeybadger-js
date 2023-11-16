import { expect, td } from './testSetup'
import FormData from 'form-data'
import { Buffer } from 'buffer'
import { Response, FetchError } from 'node-fetch'

describe('sourcemaps', () => {
  const fetchMock = td.func()  
  const hbOptions = {
    endpoint: 'https://honeybadger.io/api/sourcemaps/test',
    assetsUrl: 'https://foo.bar', 
    apiKey: 'test_key', 
    retries: 0,
    revision: '12345', 
    silent: false, 
    workerCount: 3,
  }
  
  // Mock accessing the files 
  async function readFileMock(filePath: string) {
    return Buffer.from(filePath)
  }

  let sourcemaps

  beforeEach(async () => {
    // Replace node-fetch with a mock before importing 
    td.replace('node-fetch', fetchMock);
    td.replace('fs', { promises: { readFile: readFileMock } })
    sourcemaps = await import('../src/sourcemaps')
  })

  afterEach(() => {
    td.reset()
  })

  describe('uploadSourcemaps', () => {
    it('should warn if no sourcemaps are passed in and silent is false', async () => {
      const warnMock = td.replace(console, 'warn')
      await sourcemaps.uploadSourcemaps( 
        [], 
        { silent: false }
      )
      td.verify(warnMock('Could not find any sourcemaps in the bundle. Nothing will be uploaded.'))
    })

    it('should resolve with responses if all files are uploaded', async () => {
      const sourcemapData = [1, 2, 3].map(i => ({ 
        sourcemapFilename: `index-${i}.map.js`, 
        sourcemapFilePath: `path/to/index-${i}.map.js`, 
        jsFilename: `index-${i}.js`, 
        jsFilePath: `path/to/index-${i}.js`,
      }))

      const infoMock = td.replace(console, 'info')
      // Return jsFilename in the mock response so we can easily check that fetch
      // was called for all 3 files
      td.when(fetchMock(hbOptions.endpoint, td.matchers.anything()))
        .thenDo(async ( endpoint, { body }) => {
          const match = body.getBuffer().toString().match(/name="minified_file"; filename=".*"/)
          const jsFilename = match[0].slice(32, -1)
          return new Response(JSON.stringify({ jsFilename }), { status: 200 })
        })

      const responses = await sourcemaps.uploadSourcemaps(sourcemapData, hbOptions)
      expect(responses).to.have.length(3)

      const responseBodies = await Promise.all(responses.map(res => res.json()))
      sourcemapData.forEach(({ jsFilename }) => {
        expect(responseBodies).to.deep.include({ jsFilename })
      })
      td.verify(infoMock('3 sourcemap file(s) successfully uploaded to Honeybadger'))
    })

    it('should reject with an error if there are failures', async () => {
      const sourcemapData = [1, 2, 3].map(i => ({ 
        sourcemapFilename: `index-${i}.map.js`, 
        sourcemapFilePath: `path/to/index-${i}.map.js`, 
        jsFilename: `index-${i}.js`, 
        jsFilePath: `path/to/index-${i}.js`,
      }))

      // Two rejections, one fulfilled promise
      td.when(fetchMock(hbOptions.endpoint, td.matchers.anything()))
        .thenResolve(new Response('', { status: 200 }))
      td.when(fetchMock(hbOptions.endpoint, td.matchers.anything()), { times: 2 })
        .thenReject(new FetchError('Nope', 'Fail'))

      try {
        await sourcemaps.uploadSourcemaps(sourcemapData, hbOptions)
      } catch (err) {
        expect(err.message).to.include('Failed to upload 2 sourcemap file(s)')
      }
    })
  })

  describe('uploadSourcemap', () => {
    const testData = {
      sourcemapFilename: 'index.map.js',
      sourcemapFilePath: 'path/to/index.map.js', 
      jsFilename: 'index.js', 
      jsFilePath: 'path/to/index.js',   
    }

    it('should resolve with the response if the response is ok', async () => {
      // Check we called fetch with the expected arguments
      td.when(fetchMock(hbOptions.endpoint, {
        method: 'POST',
        body: td.matchers.isA(Object),
        redirect: 'follow',
        retries: hbOptions.retries,
        retryDelay: 1000
      }))
        .thenResolve(new Response('Ok', { status: 200 }))

      const res = await sourcemaps.uploadSourcemap(testData, hbOptions)
      expect(res.status).to.equal(200)
    })

    it('should reject with an error if fetch rejects', async () => {
      td.when(fetchMock(hbOptions.endpoint, td.matchers.anything()))
        .thenReject(new FetchError('Go fetch it yourself', 'Grrr'))

      try {
        await sourcemaps.uploadSourcemap(testData, hbOptions)
      } catch (err) {
        expect(err.message).to.equal('Failed to upload sourcemap index.map.js to Honeybadger: FetchError - Go fetch it yourself')
      }
    })

    it('should reject with a useful error if response is not ok', async () => {
      // Nothing useful in the body
      let res = new Response(JSON.stringify({ foo: 'bar' }), { status: 500, statusText: 'Internal server error' })
      td.when(fetchMock(hbOptions.endpoint, td.matchers.anything()))
        .thenResolve(res)
      try {
        await sourcemaps.uploadSourcemap(testData, hbOptions)
      } catch (err) {
        expect(err.message).to.equal('Failed to upload sourcemap index.map.js to Honeybadger: 500 - Internal server error')
      }
      
      // No body at all
      res = new Response('', { status: 404, statusText: 'Not found' })
      td.when(fetchMock(hbOptions.endpoint, td.matchers.anything()))
        .thenResolve(res)
      try {
        await sourcemaps.uploadSourcemap(testData, hbOptions)
      } catch (err) {
        expect(err.message).to.equal('Failed to upload sourcemap index.map.js to Honeybadger: 404 - Not found')
      }

      // Body contains error data
      res = new Response(JSON.stringify({ error: 'Server has the hiccups' }), { status: 500 })
      td.when(fetchMock(hbOptions.endpoint, td.matchers.anything()))
        .thenResolve(res)
      try {
        await sourcemaps.uploadSourcemap(testData, hbOptions)
      } catch (err) {
        expect(err.message).to.equal('Failed to upload sourcemap index.map.js to Honeybadger: 500 - Server has the hiccups')
      }
    })

    it('should not retry if retries = 0', async () => {
      const okRes = new Response('', { status: 201 })

      // Reject once, then resolve
      td.when(fetchMock(hbOptions.endpoint, td.matchers.anything()))
        .thenResolve(okRes)
      td.when(fetchMock(hbOptions.endpoint, td.matchers.anything()), { times: 1 })
        .thenReject(new FetchError('', ''))

      try {
        await sourcemaps.uploadSourcemap(testData, hbOptions)
      } catch (err) {
        expect(err.message).to.equal('Failed to upload sourcemap index.map.js to Honeybadger: FetchError')
      }
    })

    it('should retry if retries > 0', async () => {
      const okRes = new Response('', { status: 201 })

      // Reject once, then resolve
      td.when(fetchMock(hbOptions.endpoint, td.matchers.anything()))
        .thenResolve(okRes)
      td.when(fetchMock(hbOptions.endpoint, td.matchers.anything()), { times: 1 })
        .thenReject(new FetchError('', ''))
      
      const res = await sourcemaps.uploadSourcemap(testData, { ...hbOptions, retries: 3 })
      expect(res.status).to.equal(201)
    })
  })

  describe('buildBodyForSourcemapUpload', () => {
    const testData = {
      sourcemapFilename: 'index.map.js',
      sourcemapFilePath: 'path/to/index.map.js', 
      jsFilename: 'index.js', 
      jsFilePath: 'path/to/index.js',   
    }

    it('should return an instance of FormData with expected entries', async () => {
      const result = await sourcemaps.buildBodyForSourcemapUpload(testData, hbOptions)

      expect(result).to.be.an.instanceOf(FormData)

      const buf = result.getBuffer()
      const str = buf.toString()

      const expectedFields = [
        ['api_key', 'test_key'], 
        ['minified_url', 'https://foo.bar/index.js'], 
        ['revision', '12345'],    
      ]
      const expectedFiles = [
        ['minified_file', 'index.js', 'application/javascript'], 
        ['source_map', 'index.map.js', 'application/octet-stream']
      ]

      expectedFields.forEach(([key, value]) => {
        const pattern = new RegExp(`Content-Disposition: form-data; name="${key}"\\s*${value}`)
        expect(str.match(pattern)).to.have.length(1)
      })  
      expectedFiles.forEach(([key, fileName, type]) => {
        const pattern = new RegExp(`Content-Disposition: form-data; name="${key}"; filename="${fileName}"\\s*Content-Type: ${type}`)
        expect(str.match(pattern)).to.have.length(1)
      }) 
    })

    it('should support assetsUrl with path', async () => {
      const result = await sourcemaps.buildBodyForSourcemapUpload(testData, { ...hbOptions, assetsUrl: 'https://foo.bar/_next' })

      expect(result).to.be.an.instanceOf(FormData)

      const buf = result.getBuffer()
      const str = buf.toString()

      const expectedFields = [
        ['api_key', 'test_key'], 
        ['minified_url', 'https://foo.bar/_next/index.js'], 
        ['revision', '12345'],    
      ]
      const expectedFiles = [
        ['minified_file', 'index.js', 'application/javascript'], 
        ['source_map', 'index.map.js', 'application/octet-stream']
      ]

      expectedFields.forEach(([key, value]) => {
        const pattern = new RegExp(`Content-Disposition: form-data; name="${key}"\\s*${value}`)
        expect(str.match(pattern)).to.have.length(1)
      })  
      expectedFiles.forEach(([key, fileName, type]) => {
        const pattern = new RegExp(`Content-Disposition: form-data; name="${key}"; filename="${fileName}"\\s*Content-Type: ${type}`)
        expect(str.match(pattern)).to.have.length(1)
      }) 
    })
  })
})
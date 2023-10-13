/* eslint-env mocha */

import { expect } from 'chai'
import * as sinon from 'sinon'
import nock from 'nock'

import { promises as fs } from 'fs'
// eslint-disable-next-line import/default
import HoneybadgerSourceMapPlugin from '../src/HoneybadgerSourceMapPlugin'

const TEST_ENDPOINT = 'https://api.honeybadger.io'
const SOURCEMAP_PATH = '/v1/source_maps'
const DEPLOY_PATH = '/v1/deploys'

describe('HoneybadgerSourceMapPlugin', function () {
  let compiler
  let plugin

  const options = {
    apiKey: 'abcd1234',
    assetsUrl: 'https://cdn.example.com/assets', 
    endpoint: `${TEST_ENDPOINT}${SOURCEMAP_PATH}`,
    deployEndpoint: `${TEST_ENDPOINT}${DEPLOY_PATH}`,
  }

  beforeEach(function () {
    compiler = {
      hooks: {
        afterEmit: { tapPromise: sinon.spy() }
      }
    }
    plugin = new HoneybadgerSourceMapPlugin(options)
    nock.disableNetConnect()
  })

  afterEach(function () {
    sinon.restore()
    nock.cleanAll()
  })

  describe('constructor', function () {
    it('should return an instance', function () {
      expect(plugin).to.be.an.instanceof(HoneybadgerSourceMapPlugin)
    })

    it('should set options using defaults from plugin-core', function () {
      const options = {
        ...options,
        apiKey: 'other-api-key',
        assetsUrl: 'https://cdn.example.com/assets',
        endpoint: 'https://my-random-endpoint.com'
      }
      const plugin = new HoneybadgerSourceMapPlugin(options)
      expect(plugin.options).to.deep.equal({
        apiKey: "other-api-key",
        assetsUrl: "https://cdn.example.com/assets",
        deploy: false,
        deployEndpoint: "https://api.honeybadger.io/v1/deploys",
        endpoint: "https://my-random-endpoint.com",
        ignoreErrors: false,
        ignorePaths: [],
        retries: 3,
        revision: "main",
        silent: false,
        workerCount: 5,
      })
    })
  })

  describe('apply', function () {
    it('should hook into "after-emit"', function () {
      compiler.plugin = sinon.stub()
      plugin.apply(compiler)

      const tapPromise = compiler.hooks.afterEmit.tapPromise
      expect(tapPromise.callCount).to.eq(1)

      const compilerArgs = tapPromise.getCall(0).args
      compilerArgs[1] = compilerArgs[1].toString()

      expect(compilerArgs).to.include.members([
        'HoneybadgerSourceMapPlugin',
        compilerArgs[1]
      ])
    })
  })

  describe.only('afterEmit', function () {
    let compilation
    
    beforeEach(() => {
      compilation = {
        errors: [],
        warnings: [],
      }
    })

    it('should call uploadSourceMaps', async function () {
      //TODO
      plugin.uploadSourceMaps = sinon.stub()
      // sinon.stub(plugin, 'uploadSourceMaps')

      await plugin.afterEmit(compilation)

      expect(plugin.uploadSourceMaps.callCount).to.eq(1)
      expect(compilation.errors.length).to.eq(0)
      expect(compilation.warnings.length).to.eq(0)
    })

    it('should call sendDeployNotification if deploy is true', async () => {
      plugin.options.deploy = true
      sinon.stub(plugin, 'uploadSourceMaps')
      
      let deployCallCount = 0
      nock(TEST_ENDPOINT)
        .post(DEPLOY_PATH)
        .reply(201, () => {
          deployCallCount++
          return JSON.stringify({ status: 'OK' })
        })

      await plugin.afterEmit(compilation)
      expect(deployCallCount).to.equal(1)
    })

    it('should call sendDeployNotification if deploy is a deploy object', async () => {
      plugin.options.deploy = {
        environment: 'test',
        repository: 'https://cdn.example.com',
        localUsername: 'itsMeHi'
      }
      sinon.stub(plugin, 'uploadSourceMaps')
      
      let deployCallCount = 0
      nock(TEST_ENDPOINT)
        .post(DEPLOY_PATH)
        .reply(201, () => {
          deployCallCount++
          return JSON.stringify({ status: 'OK' })
        })

      await plugin.afterEmit(compilation)
      expect(deployCallCount).to.equal(1)
    })

    it('should add upload warnings to compilation warnings, ' +
      'if ignoreErrors is true and silent is false', async function () {
      plugin.options.ignoreErrors = true
      plugin.options.silent = false

      sinon.stub(plugin, 'uploadSourceMaps')
        .callsFake(() => { throw new Error() })

      await plugin.afterEmit(compilation)

      expect(plugin.uploadSourceMaps.callCount).to.eq(1)
      expect(compilation.errors.length).to.eq(0)
      expect(compilation.warnings.length).to.eq(1)
      expect(compilation.warnings[0]).to.be.an.instanceof(Error)
    })

    it('should not add upload errors to compilation warnings if silent is true', async function () {
      plugin.options.ignoreErrors = true
      plugin.options.silent = true

      sinon.stub(plugin, 'uploadSourceMaps')
        .callsFake(() => { throw new Error() })

      await plugin.afterEmit(compilation)

      expect(plugin.uploadSourceMaps.callCount).to.eq(1)
      expect(compilation.errors.length).to.eq(0)
      expect(compilation.warnings.length).to.eq(0)
    })

    it('should add upload errors to compilation errors', async function () {
      plugin.options.ignoreErrors = false

      sinon.stub(plugin, 'uploadSourceMaps')
        .callsFake(() => { throw new Error() })

      await plugin.afterEmit(compilation)

      expect(plugin.uploadSourceMaps.callCount).to.eq(1)
      expect(compilation.warnings.length).to.eq(0)
      expect(compilation.errors.length).to.be.eq(1)
      expect(compilation.errors[0]).to.be.an.instanceof(Error)
    })
  })

  describe('getAssets', function () {
    const chunks = [
      {
        id: 0,
        names: ['app'],
        files: ['app.5190.js', 'app.5190.js.map']
      }, 
      {
        id: 1,
        names: ['foo'],
        files: ['foo.5190.js']
      },
    ]
    const outputPath = '/fake/output/path'
    const compilation = {
      getStats: () => ({
        toJson: () => ({ chunks })
      }), 
      compiler: { outputPath },
      getPath: () => outputPath,
    }

    const expectedassets = [
      { 
        jsFilePath: "/fake/output/path/app.5190.js.map",
        jsFilename: "app.5190.js.map",
        sourcemapFilePath: "/fake/output/path/app.5190.js",
        sourcemapFilename: "app.5190.js", 
      }
    ]

    it('should return an array of js, sourcemap tuples', function () {
      const assets = plugin.getAssets(compilation)
      expect(assets).to.deep.eq(expectedassets)
    })

    it('should ignore chunks that do not have a sourcemap asset', function () {
      const assets = plugin.getAssets(compilation)
      expect(assets).to.deep.eq(expectedassets)
    })

    it('should get the source map files from auxiliaryFiles in Webpack 5', function () {
      const w5chunks = [
        {
          id: 0,
          names: ['app'],
          files: ['app.5190.js'],
          auxiliaryFiles: ['app.5190.js.map']
        }
      ]

      const w5compilation = {
        ...compilation,
        getStats: () => ({
          toJson: () => ({ chunks: w5chunks })
        })
      }

      const assets = plugin.getAssets(w5compilation)
      expect(assets).to.deep.eq(expectedassets)
    })
  })

  describe('uploadSourceMaps', function () {
    let compilation
    let assets 

    beforeEach(function () {
      compilation = { name: 'test', errors: [] }
      assets = [
        { sourceFile: 'vendor.5190.js', sourceMap: 'vendor.5190.js.map' },
        { sourceFile: 'app.5190.js', sourceMap: 'app.5190.js.map' }
      ]
      sinon.stub(plugin, 'getAssets').returns(assets)
      sinon.stub(plugin, 'uploadSourceMap')
        .callsFake(() => {})
    })

    it('should call uploadSourceMap for each chunk', async function () {
      await plugin.uploadSourceMaps(compilation)

      expect(plugin.getAssets.callCount).to.eq(1)
      expect(compilation.errors.length).to.eq(0)
      expect(plugin.uploadSourceMap.callCount).to.eq(2)

      expect(plugin.uploadSourceMap.getCall(0).args[0])
        .to.deep.eq({ name: 'test', errors: [] })
      expect(plugin.uploadSourceMap.getCall(0).args[1])
        .to.deep.eq({ sourceFile: 'vendor.5190.js', sourceMap: 'vendor.5190.js.map' })

      expect(plugin.uploadSourceMap.getCall(1).args[0])
        .to.deep.eq({ name: 'test', errors: [] })
      expect(plugin.uploadSourceMap.getCall(1).args[1])
        .to.deep.eq({ sourceFile: 'app.5190.js', sourceMap: 'app.5190.js.map' })
    })

    it('should throw an error if the uploadSourceMap function returns an error', function () {
      plugin.uploadSourceMap.restore()

      const error = new Error()
      sinon.stub(plugin, 'uploadSourceMap')
        .callsFake(() => {})
        .rejects(error)

      // Chai doesnt properly async / await rejections, so we gotta work around it
      // with a...Promise ?!
      plugin.uploadSourceMaps(compilation)
        .catch((err) => expect(err).to.eq(error))
    })

    context('If no sourcemaps are found', function () {
      it('Should warn a user if silent is false', async function () {
        plugin.getAssets.restore()
        sinon.stub(plugin, 'getAssets').returns([])
        const info = sinon.stub(console, 'info')

        nock(TEST_ENDPOINT)
          .filteringRequestBody(function (_body) { return '*' })
          .post(SOURCEMAP_PATH, '*')
          .reply(200, JSON.stringify({ status: 'OK' }))

        const { compilation } = this
        plugin.options.silent = false

        await plugin.uploadSourceMaps(compilation)

        expect(console.info.calledWith(plugin.noAssetsFoundMessage)).to.eq(true)
      })

      it('Should not warn a user if silent is true', async function () {
        plugin.getAssets.restore()
        sinon.stub(plugin, 'getAssets').returns([])
        const info = sinon.stub(console, 'info')

        nock(TEST_ENDPOINT)
          .post(SOURCEMAP_PATH)
          .reply(200, JSON.stringify({ status: 'OK' }))

        const { compilation } = this
        plugin.options.silent = true

        await plugin.uploadSourceMaps(compilation)

        expect(info.notCalled).to.eq(true)
      })
    })
  })

  describe('uploadSourceMap', function () {
    const outputPath = '/fake/output/path'
    const compilation = {
      assets: {
        'vendor.5190.js.map': { source: () => '{"version":3,"sources":[]' },
        'app.5190.js.map': { source: () => '{"version":3,"sources":[]' }
      },
      compiler: { outputPath },
      errors: [],
      getPath: () => outputPath
    }

    const chunk = {
      sourceFile: 'vendor.5190.js',
      sourceMap: 'vendor.5190.js.map'
    }

    let info
    beforeEach(function () {
      info = sinon.stub(console, 'info')
      sinon.stub(fs, 'readFile')
        .callsFake(() => Promise.resolve('data'))
    })

    it('should callback without err param if upload is success', async function () {
      // FIXME/TODO test multipart form body ... it isn't really supported easily by nock
      nock(TEST_ENDPOINT)
        .post(SOURCEMAP_PATH)
        .reply(201, JSON.stringify({ status: 'OK' }))

      await plugin.uploadSourceMap(compilation, chunk)

      expect(console.info.calledWith('Uploaded vendor.5190.js.map to Honeybadger API')).to.eq(true)
    })

    it('should not log upload to console if silent option is true', async function () {
      nock(TEST_ENDPOINT)
        .post(SOURCEMAP_PATH)
        .reply(201, JSON.stringify({ status: 'OK' }))

      plugin.options.silent = true

      await plugin.uploadSourceMap(compilation, chunk)

      expect(info.notCalled).to.eq(true)
    })

    it('should log upload to console if silent option is false', async function () {
      nock(TEST_ENDPOINT)
        .post(SOURCEMAP_PATH)
        .reply(201, JSON.stringify({ status: 'OK' }))

      plugin.options.silent = false

      await plugin.uploadSourceMap(compilation, chunk)

      expect(info.calledWith('Uploaded vendor.5190.js.map to Honeybadger API')).to.eq(true)
    })

    it('should return error message if failure response includes message', function () {
      nock(TEST_ENDPOINT)
        .post(SOURCEMAP_PATH)
        .reply(
          422,
          JSON.stringify({ error: 'The "source_map" parameter is required' })
        )

      plugin.uploadSourceMap(compilation, chunk).catch((err) => {
        expect(err).to.deep.include({
          message: 'failed to upload vendor.5190.js.map to Honeybadger API: The "source_map" parameter is required'
        })
      })
    })

    it('should handle error response with empty body', function () {
      nock(TEST_ENDPOINT)
        .post(SOURCEMAP_PATH)
        .reply(422, null)

      plugin.uploadSourceMap(compilation, chunk).catch((err) => {
        expect(err.message).to.match(/failed to upload vendor\.5190.js\.map to Honeybadger API: [\w\s]+/)
      })
    })

    it('should handle HTTP request error', function () {
      nock(TEST_ENDPOINT)
        .post(SOURCEMAP_PATH)
        .replyWithError('something awful happened')

      plugin.uploadSourceMap(compilation, chunk).catch((err) => {
        expect(err).to.deep.include({
          message: 'failed to upload vendor.5190.js.map to Honeybadger API: something awful happened'
        })
      })
    })

    it('should make a request to a configured endpoint', async function () {
      const endpoint = 'https://my-special-endpoint'
      const plugin = new HoneybadgerSourceMapPlugin({ ...options, endpoint: `${endpoint}${SOURCEMAP_PATH}` })
      nock(endpoint)
        .post(SOURCEMAP_PATH)
        .reply(201, JSON.stringify({ status: 'OK' }))

      await plugin.uploadSourceMap(compilation, chunk)
      expect(info.calledWith('Uploaded vendor.5190.js.map to Honeybadger API')).to.eq(true)
    })

    it('should build correct assert url', function () {
      const sourceFile1 = '/js/app.js'
      const sourceFile2 = 'js/app.js'

      const plugin = new HoneybadgerSourceMapPlugin({ 
        apiKey: 'testKey',
        assetsUrl: 'https://example.com',
      });
      expect(plugin.options.assetsUrl).to.eq('https://example.com')
      expect(plugin.getUrlToAsset(sourceFile1)).to.eq('https://example.com/js/app.js')
      expect(plugin.getUrlToAsset(sourceFile2)).to.eq('https://example.com/js/app.js')

      plugin.assetsUrl = 'https://example.com/'
      expect(plugin.assetsUrl).to.eq('https://example.com/')
      expect(plugin.getUrlToAsset(sourceFile1)).to.eq('https://example.com/js/app.js')
      expect(plugin.getUrlToAsset(sourceFile2)).to.eq('https://example.com/js/app.js')
    })
  })
})

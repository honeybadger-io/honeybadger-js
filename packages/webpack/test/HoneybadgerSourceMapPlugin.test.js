/* eslint-env mocha */

import { expect } from 'chai'
import * as sinon from 'sinon'
import nock from 'nock'

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

  describe('afterEmit', function () {
    let compilation
    const chunks = [
      {
        id: 0,
        names: ['app'],
        files: ['app.5190.js', 'app.5190.js.map']
      }, 
    ]
    const assets = [{ 
      sourcemapFilePath: "/fake/output/path/app.5190.js.map",
      sourcemapFilename: "app.5190.js.map",
      jsFilePath: "/fake/output/path/app.5190.js",
      jsFilename: "app.5190.js", 
    }]
    const outputPath = '/fake/output/path'

    beforeEach(() => {
      compilation = {
        errors: [],
        warnings: [],
        getStats: () => ({
          toJson: () => ({ chunks })
        }),
        compiler: { outputPath },
        getPath: () => outputPath,
      }
    })

    it('should call uploadSourceMaps', async function () {
      sinon.stub(plugin, 'uploadSourceMaps')

      await plugin.afterEmit(compilation)
      expect(plugin.uploadSourceMaps.callCount).to.eq(1)
      expect(plugin.uploadSourceMaps.getCall(0).args[0]).to.deep.equal(assets)
      expect(compilation.errors.length).to.eq(0)
      expect(compilation.warnings.length).to.eq(0)
    })

    it('should call sendDeployNotification if deploy is true', async () => {
      plugin.options.deploy = true
      sinon.stub(plugin, 'uploadSourceMaps')
      sinon.stub(plugin, 'sendDeployNotification')

      await plugin.afterEmit(compilation)
      expect(plugin.sendDeployNotification.callCount).to.eq(1)
      expect(plugin.sendDeployNotification.calledWith(plugin.options)).to.equal(true)
    })

    it('should call sendDeployNotification if deploy is a deploy object', async () => {
      plugin.options.deploy = {
        environment: 'test',
        repository: 'https://cdn.example.com',
        localUsername: 'itsMeHi'
      }
      sinon.stub(plugin, 'uploadSourceMaps')
      sinon.stub(plugin, 'sendDeployNotification')
      
      await plugin.afterEmit(compilation)
      expect(plugin.sendDeployNotification.callCount).to.eq(1)
      expect(plugin.sendDeployNotification.calledWith(plugin.options)).to.equal(true)
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

    const expectedAssets = [
      { 
        sourcemapFilePath: "/fake/output/path/app.5190.js.map",
        sourcemapFilename: "app.5190.js.map",
        jsFilePath: "/fake/output/path/app.5190.js",
        jsFilename: "app.5190.js", 
      }
    ]

    it('should return an array of js, sourcemap tuples', function () {
      const assets = plugin.getAssets(compilation)
      expect(assets).to.deep.eq(expectedAssets)
    })

    it('should ignore chunks that do not have a sourcemap asset', function () {
      const assets = plugin.getAssets(compilation)
      expect(assets).to.deep.eq(expectedAssets)
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
      expect(assets).to.deep.eq(expectedAssets)
    })
  })
})

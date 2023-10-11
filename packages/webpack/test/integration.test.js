/* eslint-env mocha */

// eslint-disable-next-line import/default
import HoneybadgerSourceMapPlugin from '../src/HoneybadgerSourceMapPlugin'
import webpack from 'webpack'
import { expect } from 'chai'
import path from 'path'
import nock from 'nock'
import * as sinon from 'sinon'

const ASSETS_URL = 'https://cdn.example.com/assets'
const TEST_ENDPOINT = 'https://test.honeybadger.io'
const SOURCEMAP_PATH = '/v1/source_maps'
const DEPLOY_PATH = '/v1/deploys'

describe('integration', () => {
  let consoleInfo 
  let sourcemapNock
  let deployNock
  const baseWebpackConfig = {
    mode: 'development',
    entry: path.join(__dirname, 'fixtures/uncompiled.js'),
    output: {
      path: path.join(__dirname, '../tmp/')
    },
    devtool: 'source-map',
  }
  const baseHbConfig = {
    apiKey: 'abc123',
    retries: 0,
    assetsUrl: ASSETS_URL,
    revision: 'master',
    endpoint: `${TEST_ENDPOINT}${SOURCEMAP_PATH}`,
    deployEndpoint: `${TEST_ENDPOINT}${DEPLOY_PATH}`,
  }

  beforeEach(() => {
    consoleInfo = sinon.stub(console, 'info')
    nock.disableNetConnect()
    sourcemapNock = nock(TEST_ENDPOINT)
      .post(SOURCEMAP_PATH)
      .reply(201, JSON.stringify({ status: 'OK' }))
    deployNock = nock(TEST_ENDPOINT)
      .post(DEPLOY_PATH)
      .reply(201, JSON.stringify({ status: 'OK' }))
  })

  afterEach(() => {
    sinon.restore()
    nock.cleanAll()
  })

  it('uploads sourcemaps but does not send deploy notification if no deploy config', function (done) { 
    const webpackConfig = {
      ...baseWebpackConfig,
      plugins: [new HoneybadgerSourceMapPlugin(baseHbConfig)]
    }

    webpack(webpackConfig, (err, stats) => {
      expect(err).to.eq(null)
  
      const info = stats.toJson('errors-warnings')
      expect(info.errors.length).to.equal(0)
      expect(info.warnings.length).to.equal(0)
      
      expect(sourcemapNock.isDone()).to.equal(true)
      expect(deployNock.isDone()).to.equal(false)
      expect(consoleInfo.calledWith('Uploaded main.js.map to Honeybadger API')).to.eq(true)
      expect(consoleInfo.calledWith('Successfully sent deploy notification to Honeybadger API.')).to.eq(false)
      done()
    })
  })
  
  it('uploads source maps and sends deployment notification if configured', function (done) {    
    const webpackConfig = {
      ...baseWebpackConfig,
      plugins: [new HoneybadgerSourceMapPlugin({
        ...baseHbConfig,
        deploy: {
          environment: 'production',
          repository: 'https://cdn.example.com',
          localUsername: 'Jane'
        },
      })]
    }
  
    webpack(webpackConfig, (err, stats) => {
      expect(err).to.eq(null)
  
      const info = stats.toJson('errors-warnings')
      expect(info.errors.length).to.equal(0)
      expect(info.warnings.length).to.equal(0)
  
      expect(sourcemapNock.isDone()).to.equal(true)
      expect(deployNock.isDone()).to.equal(true)
      expect(consoleInfo.calledWith('Uploaded main.js.map to Honeybadger API')).to.eq(true)
      expect(consoleInfo.calledWith('Successfully sent deploy notification to Honeybadger')).to.eq(true)
      done()
    })
  })
})


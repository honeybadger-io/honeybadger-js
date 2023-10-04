/* eslint-env mocha */

// eslint-disable-next-line import/default
import HoneybadgerSourceMapPlugin from '../src/HoneybadgerSourceMapPlugin'
import webpack from 'webpack'
import chai from 'chai'
import path from 'path'
import nock from 'nock'
import * as sinon from 'sinon'

const expect = chai.expect

const ASSETS_URL = 'https://cdn.example.com/assets'
const TEST_ENDPOINT = 'https://api.honeybadger.io'
const SOURCEMAP_PATH = '/v1/source_maps'
const DEPLOY_PATH = '/v1/deploys'

describe('integration', () => {
  let consoleInfo 

  beforeEach(() => {
    consoleInfo = sinon.stub(console, 'info')
  })

  afterEach(() => {
    sinon.restore()
  })

  it('only uploads source maps if no deploy config', function (done) {
    nock(TEST_ENDPOINT)
      .post(SOURCEMAP_PATH)
      .reply(201, JSON.stringify({ status: 'OK' }))
  
    const webpackConfig = {
      mode: 'development',
      entry: path.join(__dirname, 'fixtures/uncompiled.js'),
      output: {
        path: path.join(__dirname, '../tmp/')
      },
      devtool: 'source-map',
      plugins: [new HoneybadgerSourceMapPlugin({
        apiKey: 'abc123',
        retries: 0,
        assetsUrl: ASSETS_URL,
        revision: 'master'
      })]
    }
    webpack(webpackConfig, (err, stats) => {
      expect(err).to.eq(null)
  
      const info = stats.toJson('errors-warnings')
      console.log('ERRRRRRR', info.errors)
      expect(info.errors.length).to.equal(0)
      // expect(info.warnings.length).to.equal(0)
  
      // expect(consoleInfo.calledWith('Uploaded main.js.map to Honeybadger API')).to.eq(true)
      // expect(consoleInfo.calledWith('Successfully sent deploy notification to Honeybadger API.')).to.eq(false)
      done()
    })
  })
  
  it('uploads source maps and sends deployment notification if configured', function (done) {
    nock(TEST_ENDPOINT)
      .post(SOURCEMAP_PATH)
      .reply(201, JSON.stringify({ status: 'OK' }))
    nock(TEST_ENDPOINT)
      .post(DEPLOY_PATH)
      .reply(201, JSON.stringify({ status: 'OK' }))
  
    const webpackConfig = {
      mode: 'development',
      entry: path.join(__dirname, 'fixtures/uncompiled.js'),
      output: {
        path: path.join(__dirname, '../tmp/')
      },
      devtool: 'source-map',
      plugins: [new HoneybadgerSourceMapPlugin({
        apiKey: 'abc123',
        retries: 0,
        assetsUrl: ASSETS_URL,
        revision: 'master',
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
  
      expect(consoleInfo.calledWith('Uploaded main.js.map to Honeybadger API')).to.eq(true)
      expect(consoleInfo.calledWith('Successfully sent deploy notification to Honeybadger')).to.eq(true)
      done()
    })
  })
})


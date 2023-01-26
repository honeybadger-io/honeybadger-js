import { expect } from 'chai'
import * as td from 'testdouble'

describe('Index', () => {
  let honeybadgerRollupPlugin
  let cleanOptionsMock
  let extractSourcemapDataFromBundleMock
  let uploadSourcemapsMock
  const options = { apiKey: 'test_key', assetsUrl: 'https://foo.bar' }

  beforeEach(async () => {
    const optionsModule = await td.replaceEsm('../src/options.js');
    cleanOptionsMock = optionsModule.cleanOptions
    const rollupUtilsModule = await td.replaceEsm('../src/rollupUtils.js')
    extractSourcemapDataFromBundleMock = rollupUtilsModule.extractSourcemapDataFromBundle
    const hbUtilsModule = await td.replaceEsm('../src/hbUtils.js')
    uploadSourcemapsMock = hbUtilsModule.uploadSourcemaps
    const indexModule = await import('../src/index.js')
    honeybadgerRollupPlugin = indexModule.default
  })

  afterEach(() => {
    td.reset()
  })

  it('cleans the options, returns the expected format for a plugin', () => {
    const options = { apiKey: 'test_key', assetsUrl: 'https://foo.bar' }
    const plugin = honeybadgerRollupPlugin(options)

    td.verify(cleanOptionsMock(options))
    expect(plugin.name).to.equal('honeybadger')
    expect(plugin.writeBundle).to.be.a('function') 
  })

  it('has a writeBundle function that uploads sourcemaps', async () => {
    const outputOptions = { dir: 'dist' }
    const bundle = { 'index.map.js': {} }
    const sourcemapData = [{ sourcemapFilename: 'index.map.js' }]
    td.when(extractSourcemapDataFromBundleMock({ outputOptions, bundle })).thenReturn(sourcemapData)
    td.when(cleanOptionsMock(options)).thenReturn(options)

    const plugin = honeybadgerRollupPlugin(options)
    await plugin.writeBundle(outputOptions, bundle)

    td.verify(uploadSourcemapsMock({ sourcemapData, hbOptions: options }))
  })
})
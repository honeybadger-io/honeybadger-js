import { expect } from 'chai'
import * as td from 'testdouble'

describe('Index', () => {
  let honeybadgerRollupPlugin:Function
  let cleanOptionsMock:Function
  let isNonProdEnvMock:Function
  let extractSourcemapDataFromBundleMock:Function
  let uploadSourcemapsMock:Function
  let sendDeployNotificationMock:Function
  const options = { apiKey: 'test_key', assetsUrl: 'https://foo.bar' }

  beforeEach(async () => {
    cleanOptionsMock = td.func()
    td.replace('../src/options.js', { cleanOptions: cleanOptionsMock });
    // cleanOptionsMock = optionsModule.cleanOptions
    extractSourcemapDataFromBundleMock = td.func()
    isNonProdEnvMock = td.func()
    td.replace('../src/rollupUtils.js', {
      extractSourcemapDataFromBundle: extractSourcemapDataFromBundleMock,
      isNonProdEnv: isNonProdEnvMock
    })
    // extractSourcemapDataFromBundleMock = rollupUtilsModule.extractSourcemapDataFromBundle
    // isNonProdEnvMock = rollupUtilsModule.isNonProdEnv
    uploadSourcemapsMock = td.func()
    sendDeployNotificationMock = td.func()
    td.replace('../src/hbUtils.js', {
      uploadSourcemaps: uploadSourcemapsMock, 
      sendDeployNotification: sendDeployNotificationMock
    })
    // uploadSourcemapsMock = hbUtilsModule.uploadSourcemaps
    // sendDeployNotificationMock = hbUtilsModule.sendDeployNotification
    const indexModule = await import('../src/index')
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

  describe('writeBundle', () => {
    const outputOptions = { dir: 'dist' }
    const bundle = { 'index.map.js': {} }
    const sourcemapData = [{ sourcemapFilename: 'index.map.js' }]

    it('should upload sourcemaps', async () => {
      td.when(isNonProdEnvMock()).thenReturn(false)
      td.when(extractSourcemapDataFromBundleMock(outputOptions, bundle)).thenReturn(sourcemapData)
      td.when(cleanOptionsMock(options)).thenReturn(options)
  
      const plugin = honeybadgerRollupPlugin(options)
      await plugin.writeBundle(outputOptions, bundle)
  
      td.verify(uploadSourcemapsMock(sourcemapData, options))
    })

    it('should send deploy notification if deploy is true', async () => {
      const deployTrueOpt = { ...options, deploy: true }
      td.when(isNonProdEnvMock()).thenReturn(false)
      td.when(extractSourcemapDataFromBundleMock({ outputOptions, bundle })).thenReturn(sourcemapData)
      td.when(cleanOptionsMock(deployTrueOpt)).thenReturn(deployTrueOpt)
  
      const plugin = honeybadgerRollupPlugin(deployTrueOpt)
      await plugin.writeBundle(outputOptions, bundle)
  
      td.verify(sendDeployNotificationMock(deployTrueOpt))
    })

    it('should send deploy notification if deploy is an object', async () => {
      const deployObjOpt = { ...options, deploy: { localUsername: 'me' } }
      td.when(isNonProdEnvMock()).thenReturn(false)
      td.when(extractSourcemapDataFromBundleMock({ outputOptions, bundle })).thenReturn(sourcemapData)
      td.when(cleanOptionsMock(deployObjOpt)).thenReturn(deployObjOpt)
  
      const plugin = honeybadgerRollupPlugin(deployObjOpt)
      await plugin.writeBundle(outputOptions, bundle)
  
      td.verify(sendDeployNotificationMock(deployObjOpt))
    })

    it('should not send deploy notification if deploy is false', async () => {
      const deployFalseOpt = { ...options, deploy: false }
      td.when(isNonProdEnvMock()).thenReturn(false)
      td.when(extractSourcemapDataFromBundleMock({ outputOptions, bundle })).thenReturn(sourcemapData)
      td.when(cleanOptionsMock(deployFalseOpt)).thenReturn(deployFalseOpt)
  
      const plugin = honeybadgerRollupPlugin(deployFalseOpt)
      await plugin.writeBundle(outputOptions, bundle)
      
      // Verify not called
      td.verify(sendDeployNotificationMock(), { times: 0, ignoreExtraArgs: true })
    })
  
    it('should do nothing in non-prod environments', async () => {
      td.when(isNonProdEnvMock()).thenReturn(true)
      td.when(cleanOptionsMock(options)).thenReturn(options)
  
      const plugin = honeybadgerRollupPlugin(options)
      await plugin.writeBundle(outputOptions, bundle)
  
      // Verify these were not called
      td.verify(extractSourcemapDataFromBundleMock(), { times: 0, ignoreExtraArgs: true })
      td.verify(uploadSourcemapsMock(), { times: 0, ignoreExtraArgs: true })
      td.verify(sendDeployNotificationMock(), { times: 0, ignoreExtraArgs: true })
    })
  })

  
})
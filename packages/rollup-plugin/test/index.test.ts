import { expect } from 'chai'
import { NormalizedOutputOptions, Plugin } from 'rollup'
import * as td from 'testdouble'
import { HbPluginOptions } from '../src/types'

describe('Index', () => {
  let honeybadgerRollupPlugin:(opts: Partial<HbPluginOptions> & Pick<HbPluginOptions, 'apiKey' | 'assetsUrl'>) => Plugin
  let cleanOptionsMock, 
    isNonProdEnvMock, 
    extractSourcemapDataFromBundleMock, 
    uploadSourcemapsMock, 
    sendDeployNotificationMock
  const options = { apiKey: 'test_key', assetsUrl: 'https://foo.bar' }

  beforeEach(async () => {
    cleanOptionsMock = td.func()
    isNonProdEnvMock = td.func()
    extractSourcemapDataFromBundleMock = td.func()
    uploadSourcemapsMock = td.func()
    sendDeployNotificationMock = td.func()

    td.replace('../src/options', { 
      cleanOptions: cleanOptionsMock 
    })
    td.replace('../src/rollupUtils', {
      extractSourcemapDataFromBundle: extractSourcemapDataFromBundleMock,
      isNonProdEnv: isNonProdEnvMock
    })
    td.replace('../src/hbUtils', {
      uploadSourcemaps: uploadSourcemapsMock, 
      sendDeployNotification: sendDeployNotificationMock
    })
    
    const indexModule = await import('../src/index')
    honeybadgerRollupPlugin = indexModule.default
  })

  afterEach(() => {
    td.reset()
  })

  it('cleans the options, returns the expected format for a plugin', () => {
    const plugin = honeybadgerRollupPlugin(options)

    td.verify(cleanOptionsMock(options))
    expect(plugin.name).to.equal('honeybadger')
    expect(plugin.writeBundle).to.be.a('function') 
  })

  describe('writeBundle', () => {
    const outputOptions = td.object<NormalizedOutputOptions>()
    outputOptions.dir = 'dist'
    const bundle = { 'index.map.js': {} }
    const sourcemapData = [{ sourcemapFilename: 'index.map.js' }]

    it('should upload sourcemaps', async () => {
      td.when(isNonProdEnvMock()).thenReturn(false)
      td.when(extractSourcemapDataFromBundleMock(outputOptions, bundle)).thenReturn(sourcemapData)
      td.when(cleanOptionsMock(options)).thenReturn(options)
  
      const plugin = honeybadgerRollupPlugin(options)
      //@ts-ignore
      await plugin.writeBundle(outputOptions, bundle)
  
      td.verify(uploadSourcemapsMock(sourcemapData, options))
    })

    it('should send deploy notification if deploy is true', async () => {
      const deployTrueOpt = { ...options, deploy: true }
      td.when(isNonProdEnvMock()).thenReturn(false)
      td.when(extractSourcemapDataFromBundleMock({ outputOptions, bundle })).thenReturn(sourcemapData)
      td.when(cleanOptionsMock(deployTrueOpt)).thenReturn(deployTrueOpt)
  
      const plugin = honeybadgerRollupPlugin(deployTrueOpt)
      //@ts-ignore
      await plugin.writeBundle(outputOptions, bundle)
  
      td.verify(sendDeployNotificationMock(deployTrueOpt))
    })

    it('should send deploy notification if deploy is an object', async () => {
      const deployObjOpt = { ...options, deploy: { localUsername: 'me' } }
      td.when(isNonProdEnvMock()).thenReturn(false)
      td.when(extractSourcemapDataFromBundleMock({ outputOptions, bundle })).thenReturn(sourcemapData)
      td.when(cleanOptionsMock(deployObjOpt)).thenReturn(deployObjOpt)
  
      const plugin = honeybadgerRollupPlugin(deployObjOpt)
      //@ts-ignore
      await plugin.writeBundle(outputOptions, bundle)
  
      td.verify(sendDeployNotificationMock(deployObjOpt))
    })

    it('should not send deploy notification if deploy is false', async () => {
      const deployFalseOpt = { ...options, deploy: false }
      td.when(isNonProdEnvMock()).thenReturn(false)
      td.when(extractSourcemapDataFromBundleMock({ outputOptions, bundle })).thenReturn(sourcemapData)
      td.when(cleanOptionsMock(deployFalseOpt)).thenReturn(deployFalseOpt)
  
      const plugin = honeybadgerRollupPlugin(deployFalseOpt)
      //@ts-ignore
      await plugin.writeBundle(outputOptions, bundle)
      
      // Verify not called
      td.verify(sendDeployNotificationMock(), { times: 0, ignoreExtraArgs: true })
    })
  
    it('should do nothing in non-prod environments', async () => {
      td.when(isNonProdEnvMock()).thenReturn(true)
      td.when(cleanOptionsMock(options)).thenReturn(options)
  
      const plugin = honeybadgerRollupPlugin(options)
      //@ts-ignore
      await plugin.writeBundle(outputOptions, bundle)
  
      // Verify these were not called
      td.verify(extractSourcemapDataFromBundleMock(), { times: 0, ignoreExtraArgs: true })
      td.verify(uploadSourcemapsMock(), { times: 0, ignoreExtraArgs: true })
      td.verify(sendDeployNotificationMock(), { times: 0, ignoreExtraArgs: true })
    })
  })

  
})
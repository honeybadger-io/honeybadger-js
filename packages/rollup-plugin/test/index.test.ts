import { expect } from 'chai'
import 'mocha'
import { NormalizedOutputOptions } from 'rollup'
import * as td from 'testdouble'

describe('Index', () => {
  let honeybadgerRollupPlugin
  let core, rollupUtils
  const options = {
    apiKey: 'test_key',
    assetsUrl: 'https://foo.bar',
    developmentEnvironments: ['dev', 'development', 'test']
  }

  beforeEach(async () => {
    core = td.replace('@honeybadger-io/plugin-core')
    rollupUtils = td.replace('../src/rollupUtils')

    const indexModule = await import('../src/index')
    honeybadgerRollupPlugin = indexModule.default
  })

  afterEach(() => {
    td.reset()
  })

  it('cleans the options, returns the expected format for a plugin', () => {
    const plugin = honeybadgerRollupPlugin(options)

    td.verify(core.cleanOptions(options))
    expect(plugin.name).to.equal('honeybadger')
    expect(plugin.writeBundle).to.be.a('function')
  })

  describe('writeBundle', () => {
    const outputOptions = td.object<NormalizedOutputOptions>()
    outputOptions.dir = 'dist'
    const bundle = { 'index.map.js': {} }
    const sourcemapData = [{ sourcemapFilename: 'index.map.js' }]

    it('should upload sourcemaps', async () => {
      td.when(rollupUtils.isDevEnv(options.developmentEnvironments)).thenReturn(false)
      td.when(rollupUtils.extractSourcemapDataFromBundle(outputOptions, bundle, undefined)).thenReturn(sourcemapData)
      td.when(core.cleanOptions(options)).thenReturn(options)

      const plugin = honeybadgerRollupPlugin(options)
      //@ts-ignore
      await plugin.writeBundle(outputOptions, bundle)

      td.verify(core.uploadSourcemaps(sourcemapData, options))
    })

    it('should send deploy notification if deploy is true', async () => {
      const deployTrueOpt = { ...options, deploy: true }
      td.when(rollupUtils.isDevEnv(options.developmentEnvironments)).thenReturn(false)
      td.when(rollupUtils.extractSourcemapDataFromBundle({ outputOptions, bundle })).thenReturn(sourcemapData)
      td.when(core.cleanOptions(deployTrueOpt)).thenReturn(deployTrueOpt)

      const plugin = honeybadgerRollupPlugin(deployTrueOpt)
      //@ts-ignore
      await plugin.writeBundle(outputOptions, bundle)

      td.verify(core.sendDeployNotification(deployTrueOpt))
    })

    it('should send deploy notification if deploy is an object', async () => {
      const deployObjOpt = { ...options, deploy: { localUsername: 'me' } }
      td.when(rollupUtils.isDevEnv(options.developmentEnvironments)).thenReturn(false)
      td.when(rollupUtils.extractSourcemapDataFromBundle({ outputOptions, bundle })).thenReturn(sourcemapData)
      td.when(core.cleanOptions(deployObjOpt)).thenReturn(deployObjOpt)

      const plugin = honeybadgerRollupPlugin(deployObjOpt)
      //@ts-ignore
      await plugin.writeBundle(outputOptions, bundle)

      td.verify(core.sendDeployNotification(deployObjOpt))
    })

    it('should not send deploy notification if deploy is false', async () => {
      const deployFalseOpt = { ...options, deploy: false }
      td.when(rollupUtils.isDevEnv(options.developmentEnvironments)).thenReturn(false)
      td.when(rollupUtils.extractSourcemapDataFromBundle({ outputOptions, bundle })).thenReturn(sourcemapData)
      td.when(core.cleanOptions(deployFalseOpt)).thenReturn(deployFalseOpt)

      const plugin = honeybadgerRollupPlugin(deployFalseOpt)
      //@ts-ignore
      await plugin.writeBundle(outputOptions, bundle)

      // Verify not called
      td.verify(core.sendDeployNotification(), { times: 0, ignoreExtraArgs: true })
    })

    it('should do nothing in non-prod environments', async () => {
      td.when(rollupUtils.isDevEnv(options.developmentEnvironments)).thenReturn(true)
      td.when(core.cleanOptions(options)).thenReturn(options)

      const plugin = honeybadgerRollupPlugin(options)
      //@ts-ignore
      await plugin.writeBundle(outputOptions, bundle)

      // Verify these were not called
      td.verify(rollupUtils.extractSourcemapDataFromBundle(), { times: 0, ignoreExtraArgs: true })
      td.verify(core.uploadSourcemaps(), { times: 0, ignoreExtraArgs: true })
      td.verify(rollupUtils.extractSourcemapDataFromBundle(), { times: 0, ignoreExtraArgs: true })
    })
  })


})

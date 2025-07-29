import { join } from 'path'
import { honeybadgerSourceMapPlugin } from './index'
import { Types, sendDeployNotification, uploadSourcemaps } from '@honeybadger-io/plugin-core';
import { build } from 'esbuild';
import { promises as fs } from 'fs';

jest.mock('@honeybadger-io/plugin-core', () => {
  return {
    cleanOptions: jest.requireActual('@honeybadger-io/plugin-core').cleanOptions,
    uploadSourcemaps: jest.fn(),
    sendDeployNotification: jest.fn(),
  }
})

jest.mock('fs', () => {
  return {
    promises: {
      writeFile: jest.fn(),
      mkdir: jest.fn(),
    }
  }
})

function runEsbuild(options: Types.HbPluginUserOptions, outputPath?: string) {
  const plugin = honeybadgerSourceMapPlugin(options, outputPath)

  return build({
    entryPoints: [join(__dirname, 'testFixtures/index.js')],
    bundle: true,
    minify: true,
    sourcemap: true,
    target: ['chrome58'],
    outfile: join(__dirname, 'testFixtures/build/out.js'),
    plugins: [plugin]
  })
}

describe('index', function () {

  const options: Types.HbPluginUserOptions = {
    apiKey: 'test_key',
    revision: 'test_revision',
    assetsUrl: 'https://foo.bar',
  }

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should create an esbuild plugin', function () {
    const esbuildPlugin = honeybadgerSourceMapPlugin(options)
    expect(esbuildPlugin.name).toBe('HoneybadgerSourceMapPlugin')
    expect(esbuildPlugin.setup).toBeInstanceOf(Function)
  })

  it('should upload source maps', async function () {
    process.env.NODE_ENV = 'production'

    await runEsbuild(options)

    expect(uploadSourcemaps).toHaveBeenCalledTimes(1)
    expect(sendDeployNotification).not.toHaveBeenCalled()
  })

  it('should send deploy notification when deploy is true', async function () {
    process.env.NODE_ENV = 'production'

    await runEsbuild({
      ...options,
      deploy: true
    })

    expect(uploadSourcemaps).toHaveBeenCalledTimes(1)
    expect(sendDeployNotification).toHaveBeenCalledTimes(1)
  })

  it('should send deploy notification when deploy is object', async function () {
    process.env.NODE_ENV = 'production'

    await runEsbuild({
      ...options,
      deploy: {
        repository: 'test_repo',
        localUsername: 'test_user',
        environment: process.env.NODE_ENV
      }
    })

    expect(uploadSourcemaps).toHaveBeenCalledTimes(1)
    expect(sendDeployNotification).toHaveBeenCalledTimes(1)
  })

  it('should not send deploy notification when deploy is false', async function () {
    process.env.NODE_ENV = 'production'

    await runEsbuild({
      ...options,
      deploy: false
    })

    expect(uploadSourcemaps).toHaveBeenCalledTimes(1)
    expect(sendDeployNotification).not.toHaveBeenCalled()
  })

  it('should do nothing in non-prod environment', async function () {
    process.env.NODE_ENV = 'test'

    await runEsbuild(options)

    expect(uploadSourcemaps).not.toHaveBeenCalled()
    expect(sendDeployNotification).not.toHaveBeenCalled()
  })

  it('should write files to overwriteOutputPath when provided', async function () {
    process.env.NODE_ENV = 'production'
    const customOutputPath = '/custom/output/path'

    await runEsbuild(options, customOutputPath)

    expect(fs.writeFile).toHaveBeenCalledWith(
      join(customOutputPath, 'out.js'),
      expect.any(Uint8Array)
    )
    expect(fs.writeFile).toHaveBeenCalledWith(
      join(customOutputPath, 'out.js.map'),
      expect.any(Uint8Array)
    )
  })
})

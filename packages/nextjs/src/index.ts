import fs from 'fs'
import path from 'path'
import HoneybadgerSourceMapPlugin from '@honeybadger-io/webpack'
import type { WebpackConfigContext } from 'next/dist/server/config-shared'
import { HoneybadgerNextJsConfig, NextJsRuntime, HoneybadgerWebpackPluginOptions } from './types'

const URL_DOCS_SOURCE_MAPS_UPLOAD = 'https://docs.honeybadger.io/lib/javascript/integration/nextjs/#source-map-upload-and-tracking-deploys'
let _silent = true
function log(type: 'error' | 'warn' | 'debug', msg: string): void {
  if (['error', 'warn'].includes(type) || !_silent) {
    console[type]('[HoneybadgerNextJs]', msg)
  }
}

function shouldUploadSourceMaps(honeybadgerNextJsConfig: HoneybadgerNextJsConfig, context: WebpackConfigContext): boolean {
  const { dev } = context

  if (honeybadgerNextJsConfig.disableSourceMapUpload) {
    return false
  }

  if (!honeybadgerNextJsConfig.webpackPluginOptions || !honeybadgerNextJsConfig.webpackPluginOptions.apiKey) {
    log('warn', `skipping source map upload; here's how to enable: ${URL_DOCS_SOURCE_MAPS_UPLOAD}`)
    return false
  }

  if (dev || process.env.NODE_ENV === 'development') {
    return false
  }

  return true
}

function mergeWithExistingWebpackConfig(nextJsWebpackConfig, honeybadgerNextJsConfig: HoneybadgerNextJsConfig) {
  return function webpackFunctionMergedWithHb(webpackConfig, context: WebpackConfigContext) {

    const { isServer, dir: projectDir, nextRuntime } = context
    const configType = isServer ? (nextRuntime === 'edge' ? 'edge' : 'server') : 'browser'
    log('debug', `reached webpackFunctionMergedWithHb isServer[${isServer}] configType[${configType}]`)

    let result = { ...webpackConfig }
    if (typeof nextJsWebpackConfig === 'function') {
      result = nextJsWebpackConfig(result, context)
    }

    const originalEntry = result.entry
    result.entry = async () => injectHoneybadgerConfigToEntry(originalEntry, projectDir, configType)

    if (shouldUploadSourceMaps(honeybadgerNextJsConfig, context)) {
      // `result.devtool` must be 'hidden-source-map' or 'source-map' to properly pass sourcemaps.
      // Next.js uses regular `source-map` which doesnt pass its sourcemaps to Webpack.
      // https://github.com/vercel/next.js/blob/89ec21ed686dd79a5770b5c669abaff8f55d8fef/packages/next/build/webpack/config/blocks/base.ts#L40
      // Use the hidden-source-map option when you don't want the source maps to be
      // publicly available on the servers, only to the error reporting
      result.devtool = 'hidden-source-map'
      if (!result.plugins) {
        result.plugins = []
      }
      const options = getWebpackPluginOptions(honeybadgerNextJsConfig)
      if (options) {
        result.plugins.push(new HoneybadgerSourceMapPlugin(options))
      }
    }

    return result
  }
}

async function injectHoneybadgerConfigToEntry(originalEntry, projectDir: string, configType: NextJsRuntime) {
  const hbConfigFile = getHoneybadgerConfigFile(projectDir, configType)
  if (!hbConfigFile) {
    return originalEntry
  }

  const hbConfigFileRelativePath = `./${hbConfigFile}`
  const result = typeof originalEntry === 'function' ? await originalEntry() : { ...originalEntry }
  if (!Object.keys(result).length) {
    log('debug', `no entry points for configType[${configType}]`)
  }
  for (const entryName in result) {
    addHoneybadgerConfigToEntry(result, entryName, hbConfigFileRelativePath, configType)
  }

  return result
}

function addHoneybadgerConfigToEntry(entry, entryName: string, hbConfigFile: string, configType: NextJsRuntime) {

  log('debug', `adding entry[${entryName}] to configType[${configType}]`)

  switch (configType) {
  case 'server':
    if (!entryName.startsWith('pages/')) {
      return
    }

    break
  case 'browser':
    if (!['pages/_app', 'main-app'].includes(entryName)) {
      return
    }

    break
  case 'edge':
    // nothing?

    break
  }

  const currentEntryPoint = entry[entryName]
  let newEntryPoint = currentEntryPoint

  if (typeof currentEntryPoint === 'string') {
    newEntryPoint = [hbConfigFile, currentEntryPoint]
  } else if (Array.isArray(currentEntryPoint)) {
    newEntryPoint = [hbConfigFile, ...currentEntryPoint]
  } // descriptor object (webpack 5+)
  else if (typeof currentEntryPoint === 'object' && currentEntryPoint && 'import' in currentEntryPoint) {
    const currentImportValue = currentEntryPoint['import']
    const newImportValue = [hbConfigFile]
    if (typeof currentImportValue === 'string') {
      newImportValue.push(currentImportValue)
    } else {
      newImportValue.push(...(currentImportValue))
    }
    newEntryPoint = {
      ...currentEntryPoint,
      import: newImportValue,
    };
  } else {
    log('error', 'Could not inject Honeybadger config to entry point: ' + JSON.stringify(currentEntryPoint, null, 2))
  }

  entry[entryName] = newEntryPoint
}

function getHoneybadgerConfigFile(projectDir: string, configType: NextJsRuntime): string | null {
  const possibilities = [`honeybadger.${configType}.config.ts`, `honeybadger.${configType}.config.js`]

  for (const filename of possibilities) {
    if (fs.existsSync(path.resolve(projectDir, filename))) {
      return filename;
    }
  }

  log('debug', `could not find config file in ${projectDir} for ${configType}`)
  return null
}

function getWebpackPluginOptions(honeybadgerNextJsConfig: HoneybadgerNextJsConfig): HoneybadgerWebpackPluginOptions | null {
  const apiKey = honeybadgerNextJsConfig.webpackPluginOptions?.apiKey || process.env.NEXT_PUBLIC_HONEYBADGER_API_KEY
  const assetsUrl = honeybadgerNextJsConfig.webpackPluginOptions?.assetsUrl || process.env.NEXT_PUBLIC_HONEYBADGER_ASSETS_URL
  if (!apiKey || !assetsUrl) {
    log('error', 'Missing Honeybadger required configuration for webpack plugin. Source maps will not be uploaded to Honeybadger.')

    return null
  }

  return {
    ...honeybadgerNextJsConfig.webpackPluginOptions,
    apiKey,
    assetsUrl,
    revision: honeybadgerNextJsConfig.webpackPluginOptions?.revision || process.env.NEXT_PUBLIC_HONEYBADGER_REVISION,
    silent: _silent,
  }
}

function getNextJsVersionInstalled(): [major: string, minor: string, patch: string] | null {
  try {
    return require('next/package.json').version?.split('.')
  } catch (e) {
    return null
  }
}

/**
 * NextJs will report a warning if the `serverExternalPackages` option is not present.
 * This is because @honeybadger-io/js will try to require configuration files dynamically (https://github.com/honeybadger-io/honeybadger-js/pull/1268).
 *
 * First reported here: https://github.com/honeybadger-io/honeybadger-js/issues/1351
 */
function addServerExternalPackagesOption(config) {
  // this should be available in the upcoming version of Next.js (14.3.0)
  if (config.serverExternalPackages && Array.isArray(config.serverExternalPackages)) {
    log('debug', 'adding @honeybadger-io/js to serverExternalPackages')
    config.serverExternalPackages.push('@honeybadger-io/js')
    return
  }

  if (config.experimental?.serverComponentsExternalPackages && Array.isArray(config.experimental?.serverComponentsExternalPackages)) {
    log('debug', 'adding @honeybadger-io/js to experimental.serverComponentsExternalPackages')
    config.experimental.serverComponentsExternalPackages.push('@honeybadger-io/js')
    return
  }

  const nextJsVersion = getNextJsVersionInstalled();
  if (nextJsVersion) {
    if (+nextJsVersion[0] >= 14 && +nextJsVersion[1] >= 3) {
      log('debug', 'adding serverExternalPackages option with value ["@honeybadger-io/js"]')
      config.serverExternalPackages = ['@honeybadger-io/js']
    }
    else {
      log('debug', 'adding experimental.serverComponentsExternalPackages option with value ["@honeybadger-io/js"]')
      if (!config.experimental) {
        config.experimental = {}
      }
      config.experimental.serverComponentsExternalPackages = ['@honeybadger-io/js']
    }
  }
}

export function setupHoneybadger(config, honeybadgerNextJsConfig?: HoneybadgerNextJsConfig) {
  if (!honeybadgerNextJsConfig) {
    honeybadgerNextJsConfig = {
      silent: true,
      disableSourceMapUpload: false,
    }
  }

  _silent = honeybadgerNextJsConfig.silent ?? true

  addServerExternalPackagesOption(config)

  return {
    ...config,
    webpack: mergeWithExistingWebpackConfig(config.webpack, honeybadgerNextJsConfig)
  }
}

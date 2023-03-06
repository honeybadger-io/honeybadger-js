import fs from 'fs'
import path from 'path'
import { NextConfig } from 'next'
import { NextJsWebpackConfig, WebpackConfigContext } from 'next/dist/server/config-shared'

export { Honeybadger } from '@honeybadger-io/react'

let _silent = true
function log(type: 'error' | 'debug', msg: string) {
  if (type === 'error' || !_silent) {
    console[type]('[HoneybadgerNextJs]', msg)
  }
}

export function setupHoneybadger(config: NextConfig, honeybadgerNextJsConfig?: HoneybadgerNextJsConfig) {
  _silent = honeybadgerNextJsConfig?.silent ?? true

  return {
    ...config,
    webpack: mergeWithExistingWebpackConfig(config.webpack)
  }
}

export type HoneybadgerNextJsConfig = {
  silent?: boolean
}

function mergeWithExistingWebpackConfig(nextJsWebpackConfig: NextJsWebpackConfig | null | undefined) {
  return function webpackFunctionMergedWithHb(webpackConfig: Record<string, unknown>, context: WebpackConfigContext) {

    const { isServer, dir: projectDir, nextRuntime } = context
    const configType: NextJsRuntime = isServer ? (nextRuntime === 'edge' ? 'edge' : 'server') : 'browser'
    log('debug', `reached webpackFunctionMergedWithHb isServer[${isServer}] configType[${configType}]`)
    log('debug', 'webpackConfig.entry: ' + (webpackConfig.entry as object).toString())

    let result = { ...webpackConfig }
    log('debug', 'result.entry: ' + (result.entry as object).toString())
    if (typeof nextJsWebpackConfig === 'function') {
      result = nextJsWebpackConfig(result, context)
    }

    // fixme: original entry is an async function
    const originalEntry = result.entry as Record<string, unknown>
    log('debug', `original entry point: ${JSON.stringify(originalEntry, null, 2)}`)

    result.entry = injectHoneybadgerConfigToEntry(originalEntry, projectDir, configType)

    // todo: should attach Honeybadger's webpack plugin here to upload source maps by default (on production environments)

    return result
  }
}

function injectHoneybadgerConfigToEntry(originalEntry: Record<string, unknown>, projectDir: string, configType: NextJsRuntime) {
  const hbConfigFile = getHoneybadgerConfigFile(projectDir, configType)
  if (!hbConfigFile) {
    return originalEntry
  }

  const hbConfigFileRelativePath = `./${hbConfigFile}`
  const result = { ...originalEntry }
  for (const entryName in result) {
    addHoneybadgerConfigToEntry(result, entryName, hbConfigFileRelativePath, configType)
  }

  return result
}

function addHoneybadgerConfigToEntry(entry: Record<string, unknown>, entryName: string, hbConfigFile: string, configType: NextJsRuntime) {

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
      newImportValue.push(...(currentImportValue as Array<string>))
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

type NextJsRuntime = 'server' | 'browser' | 'edge'

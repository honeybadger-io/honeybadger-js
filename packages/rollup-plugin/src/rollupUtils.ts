import path from 'node:path'
import picomatch from 'picomatch'
import { Types } from '@honeybadger-io/plugin-core'
import type { OutputBundle, OutputAsset, OutputChunk, NormalizedOutputOptions } from 'rollup'

/**
 * Extracts the data we need for sourcemap upload from the bundle
 */
export function extractSourcemapDataFromBundle (
  outputOptions: NormalizedOutputOptions,
  bundle: OutputBundle,
  ignorePaths: Array<string> = []
): Types.SourcemapInfo[] {
  const sourceMaps = Object.values(bundle).filter(isSourcemap)

  return sourceMaps.map(sourcemap => {
    return formatSourcemapData(outputOptions, sourcemap)
  }).filter((sourcemap) => isNotIgnored(sourcemap, ignorePaths))
}

function isSourcemap(file: OutputAsset | OutputChunk): file is OutputAsset {
  if (file.type !== 'asset' || !file.fileName.endsWith('.js.map') || !file.source) {
    return false
  }

  const source = typeof file.source === 'string' ? file.source : file.source.toString()
  const json = JSON.parse(source)

  return !!json.sourcesContent && json.sourcesContent.length > 0
}

function isNotIgnored(sourceMapInfo: Types.SourcemapInfo, ignorePaths: Array<string>) {
  const isMatch = picomatch.isMatch(sourceMapInfo.jsFilePath, ignorePaths, { basename: true })

  return !isMatch
}

function formatSourcemapData(
  outputOptions: NormalizedOutputOptions,
  sourcemap: OutputAsset): Types.SourcemapInfo {
  // This fileName could include a path like 'subfolder/foo.js.map'
  const sourcemapFilename = sourcemap.fileName
  const sourcemapFilePath = path.resolve(outputOptions.dir || '', sourcemapFilename)
  // As far as we've seen, rollup always puts the sourcemap in the same folder as the
  // js file and gives it the same name (plus the ".map").
  const jsFilename = sourcemapFilename.replace('.map', '')
  const jsFilePath = path.resolve(outputOptions.dir || '', jsFilename)

  return { sourcemapFilename, sourcemapFilePath, jsFilename, jsFilePath }
}

/**
 * Determines if we are in a non-production environment
 * Note that in Vite setups, NODE_ENV should definitely be available
 * In Rollup without Vite, it may or may not be available,
 * so if it's missing we'll assume prod
 */
export function isDevEnv(devEnvironments: string[]): boolean {
  if (!process.env.NODE_ENV || process.env.NODE_ENV === '') {
    return false
  }

  return devEnvironments.includes(process.env.NODE_ENV)
}

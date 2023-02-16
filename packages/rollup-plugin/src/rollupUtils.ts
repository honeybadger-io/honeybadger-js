import path from 'node:path'

import type { OutputOptions, OutputBundle, OutputAsset, OutputChunk } from 'rollup'
import type { SourcemapInfo } from './types'

/**
 * Extracts the data we need for sourcemap upload from the bundle
 */
export function extractSourcemapDataFromBundle ( 
  outputOptions: OutputOptions, 
  bundle: OutputBundle
): SourcemapInfo[] {
  const sourceMaps = Object.values(bundle).filter(isSourcemap)
  
  return sourceMaps.map(sourcemap => {
    return formatSourcemapData(outputOptions, sourcemap)
  })
}

function isSourcemap(file: OutputAsset | OutputChunk): file is OutputAsset {
  return file.type === 'asset' && file.fileName.endsWith('.js.map')
}

function formatSourcemapData(
  outputOptions: OutputOptions, 
  sourcemap: OutputAsset): SourcemapInfo {
  // This fileName could include a path like 'subfolder/foo.js.map'
  const sourcemapFilename = sourcemap.fileName
  const sourcemapFilePath = path.resolve(outputOptions.dir || '', sourcemapFilename)
  // It should be safe to assume that rollup will name the map with 
  // the same name as the js file... however we can pull the file name 
  // from the sourcemap source just in case. 
  let jsFilename: string
  if (typeof sourcemap.source === 'string') {
    const { file } = JSON.parse(sourcemap.source)
    // The file in the source won't have the subfolder, need to add it
    jsFilename = path.join(path.dirname(sourcemapFilename), file)
  } else {
    jsFilename = sourcemapFilename.replace('.map', '')
  }

  const jsFilePath = path.resolve(outputOptions.dir || '', jsFilename)

  return { sourcemapFilename, sourcemapFilePath, jsFilename, jsFilePath }
}

/**
 * Determines if we are in a non-production environment
 * Note that in Vite setups, NODE_ENV should definitely be available
 * In Rollup without Vite, it may or may not be available, 
 * so if it's missing we'll assume prod
 */
export function isNonProdEnv(): Boolean {
  return !!process.env.NODE_ENV && process.env.NODE_ENV !== 'production'
}
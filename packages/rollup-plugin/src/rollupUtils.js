import path from 'node:path'

/**
 * Extracts the data we need for sourcemap upload from the bundle
 *
 * @param {Object} outputOptions Rollup's outputOptions object
 * @param {Object} bundle Rollup's generated bundle 
 *   The bundle object looks like { [fileName: string]: AssetInfo | ChunkInfo })
 *   See https://rollupjs.org/guide/en/#writebundle
 * @returns {Array} Looks like [{ sourcemapFilename, sourcemapFilePath, jsFilename, jsFilePath }]
 */
export function extractSourcemapDataFromBundle ({ outputOptions, bundle }) {
  const sourceMaps = Object.values(bundle)
    .filter(file => file.type === 'asset' && file.fileName.endsWith('.js.map'))
  
  return sourceMaps.map(sourcemap => {
    // This fileName could include a path like 'subfolder/foo.js.map'
    const sourcemapFilename = sourcemap.fileName
    const sourcemapFilePath = path.resolve(outputOptions.dir, sourcemapFilename)
    // It should be safe to assume that rollup will name the map with 
    // the same name as the js file... however we can pull the file name 
    // from the sourcemap source just in case. 
    const { file } = JSON.parse(sourcemap.source)
    // The file in the source won't have the subfolder, need to add it
    const jsFilename = path.join(path.dirname(sourcemapFilename), file)
    const jsFilePath = path.resolve(outputOptions.dir, jsFilename)
    
    return { sourcemapFilename, sourcemapFilePath, jsFilename, jsFilePath }
  })
}
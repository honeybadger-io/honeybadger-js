import { uploadSourcemap } from "./utils"
import path from 'node:path'

export default async function onWriteBundle({ outputOptions, bundle, hbOptions }) {
  const sourcemapData = extractSourcemapDataFromBundle({ dir: outputOptions.dir, bundle })
  
  if (sourcemapData.length === 0 && !hbOptions.silent) {
    console.warn('Could not find any sourcemaps in the bundle. Nothing will be uploaded.')
  }

  const sourcemapUploadPromises = sourcemapData.map(data => {
    return uploadSourcemap({ 
      ...hbOptions,
      ...data
    })
  })
  await Promise.all(sourcemapUploadPromises)
}

/* 
 * The bundle object looks like { [fileName: string]: AssetInfo | ChunkInfo })
 * See https://rollupjs.org/guide/en/#writebundle 
 * 
**/
function extractSourcemapDataFromBundle ({ dir = '', bundle }) {
  const sourceMaps = Object.values(bundle)
    .filter(file => file.type === 'asset' && file.fileName.endsWith('.js.map'))
  
  return sourceMaps.map(sourcemap => {
    const sourcemapFilename = sourcemap.fileName
    const sourcemapFilePath = path.resolve(dir, sourcemapFilename)
    // TODO: It's probably safe to assume that rollup will name the map with 
    // the same name as the js file... however we should maybe be more careful than this
    const jsFilename = sourcemapFilename.replace('.map', '')
    const jsFilePath = path.resolve(dir, jsFilename)
    return { sourcemapFilename, sourcemapFilePath, jsFilename, jsFilePath }
  })
}
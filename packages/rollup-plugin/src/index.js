import { cleanOptions } from './options.js'
import { extractSourcemapDataFromBundle } from './rollupUtils.js'
import { uploadSourcemaps } from './hbUtils.js'

export default function honeybadgerRollupPlugin(options) {
  const hbOptions = cleanOptions(options)

  return {
    name: 'honeybadger', 
    writeBundle: async (outputOptions, bundle) => {
      const sourcemapData = extractSourcemapDataFromBundle({ outputOptions, bundle })
      await uploadSourcemaps({ sourcemapData, hbOptions })
    }
  }
}
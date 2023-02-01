import { cleanOptions } from './options.js'
import { extractSourcemapDataFromBundle, isNonProdEnv } from './rollupUtils.js'
import { uploadSourcemaps } from './hbUtils.js'

export default function honeybadgerRollupPlugin(options) {
  const hbOptions = cleanOptions(options)

  return {
    name: 'honeybadger', 
    writeBundle: async (outputOptions, bundle) => {
      if (isNonProdEnv()) {
        if (!hbOptions.silent) {
          console.info('Honeybadger will not sourcemaps in non-production environment.')
        }
        return
      }
      const sourcemapData = extractSourcemapDataFromBundle({ outputOptions, bundle })
      await uploadSourcemaps({ sourcemapData, hbOptions })
    }
  }
}
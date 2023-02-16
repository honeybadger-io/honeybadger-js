import { cleanOptions } from './options.js'
import { extractSourcemapDataFromBundle, isNonProdEnv } from './rollupUtils.js'
import { sendDeployNotification, uploadSourcemaps } from './hbUtils.js'
import type { HbPluginOptions } from './types.js'
import type { OutputOptions, OutputBundle } from 'rollup'

export default function honeybadgerRollupPlugin(options: HbPluginOptions) {
  const hbOptions = cleanOptions(options)

  return {
    name: 'honeybadger', 
    writeBundle: async (
        outputOptions: OutputOptions, 
        bundle: OutputBundle
      ) => {
      if (isNonProdEnv()) {
        if (!hbOptions.silent) {
          console.info('Honeybadger will not sourcemaps in non-production environment.')
        }
        return
      }

      const sourcemapData = extractSourcemapDataFromBundle(outputOptions, bundle)
      await uploadSourcemaps(sourcemapData, hbOptions)

      if (hbOptions.deploy) {
        await sendDeployNotification(hbOptions)
      }
    }
  }
}
import { cleanOptions } from './options'
import { extractSourcemapDataFromBundle, isNonProdEnv } from './rollupUtils'
import { sendDeployNotification, uploadSourcemaps } from './hbUtils'
import type { HbPluginOptions } from './types'
import type { OutputBundle, Plugin, NormalizedOutputOptions } from 'rollup'

export default function honeybadgerRollupPlugin(
  options: Partial<HbPluginOptions> & Pick<HbPluginOptions, 'apiKey' | 'assetsUrl'>
): Plugin {
  const hbOptions = cleanOptions(options)

  return {
    name: 'honeybadger',
    writeBundle: async (
      outputOptions: NormalizedOutputOptions,
      bundle: OutputBundle
    ) => {
      if (isNonProdEnv()) {
        if (!hbOptions.silent) {
          console.info('Honeybadger will not sourcemaps in non-production environment.')
        }
        return
      }

      const sourcemapData = extractSourcemapDataFromBundle(outputOptions, bundle, hbOptions.ignorePaths)
      await uploadSourcemaps(sourcemapData, hbOptions)

      if (hbOptions.deploy) {
        await sendDeployNotification(hbOptions)
      }
    }
  }
}

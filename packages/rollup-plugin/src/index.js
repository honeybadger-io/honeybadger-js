import { cleanOptions } from './options.js'
import onWriteBundle from './onWriteBundle'

export default function honeybadgerRollupPlugin(options) {
  const hbOptions = cleanOptions(options)

  return {
    name: 'honeybadger', 
    writeBundle: async (outputOptions, bundle) => {
      await onWriteBundle({ outputOptions, bundle, hbOptions })
    }
  }
}
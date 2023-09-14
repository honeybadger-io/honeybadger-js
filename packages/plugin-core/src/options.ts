import type { HbPluginOptions } from './types'

export const MAX_RETRIES = 10
export const DEFAULT_RETRIES = 3
export const DEFAULT_ENDPOINT = 'https://api.honeybadger.io/v1/source_maps'
export const DEFAULT_REVISION = 'main'
export const DEFAULT_SILENT = false
export const DEFAULT_DEPLOY = false
export const DEPLOY_ENDPOINT = 'https://api.honeybadger.io/v1/deploys'
export const IGNORE_PATHS = []

const required = [
  'apiKey',
  'assetsUrl'
]

const defaultOptions = {
  endpoint: DEFAULT_ENDPOINT,
  retries: DEFAULT_RETRIES,
  revision: DEFAULT_REVISION,
  silent: DEFAULT_SILENT,
  deploy: DEFAULT_DEPLOY,
  deployEndpoint: DEPLOY_ENDPOINT,
  ignorePaths: IGNORE_PATHS,
}

export function cleanOptions(
  options: Partial<HbPluginOptions> & Pick<HbPluginOptions, 'apiKey' | 'assetsUrl'>
): HbPluginOptions {
  // Validate presence of required fields
  required.forEach(field => {
    if (!options || !options[field]) {
      throw new Error(`${field} is required`)
    }
  })

  // Validate ignorePaths
  if (options.ignorePaths && !Array.isArray(options.ignorePaths)) {
    throw new Error('ignorePaths must be an array')
  }

  // Don't allow excessive retries
  if (options.retries && options.retries > MAX_RETRIES) {
    if (!options.silent) {
      console.warn(`Using max retries: ${MAX_RETRIES}`)
    }
    options.retries = MAX_RETRIES
  }

  // Merge in our defaults
  return { ...defaultOptions, ...options }
}

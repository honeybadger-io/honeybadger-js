export const PLUGIN_NAME = 'HoneybadgerSourceMapPlugin'
export const ENDPOINT = 'https://api.honeybadger.io/v1/source_maps'
export const DEPLOY_ENDPOINT = 'https://api.honeybadger.io/v1/deploys'
export const MAX_RETRIES = 10
export const MIN_WORKER_COUNT = 1

export const REQUIRED_FIELDS = [
  'apiKey',
  'assetsUrl'
]

import { uploadSourcemap, extractSourcemapDataFromBundle } from "./utils"

// TODO
const API_KEY = 'XXX'
const ASSETS_URL = 'https://localhost:3000'
const RETRIES = 1
const REVISION = 'testingMultiFile'
const HB_ENDPOINT = 'https://api.honeybadger.io/v1/source_maps'

export default async function writeBundle(outputOptions, bundle) {
  const sourcemapData = extractSourcemapDataFromBundle({ dir: outputOptions.dir, bundle })
  
  const sourcemapUploadPromises = sourcemapData.map(data => {
    return uploadSourcemap({ 
      hbEndpoint: HB_ENDPOINT,
      assetsUrl: ASSETS_URL, 
      apiKey: API_KEY, 
      bundle, 
      retries: RETRIES, 
      revision: REVISION, 
      ...data
    })
  })
  await Promise.all(sourcemapUploadPromises)
}
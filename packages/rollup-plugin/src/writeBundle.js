import { uploadSourcemap } from "./utils"

// TODO
const API_KEY = 'XXXX'
const ASSETS_URL = 'https://localhost:3000'
const RETRIES = 1
const REVISION = 'testing1234'
const HB_ENDPOINT = 'https://api.honeybadger.io/v1/source_maps'

export default async function writeBundle(outputOptions, bundle) {
  console.log('writeBundle options', outputOptions)
  console.log('writeBundle bundle', bundle)
  await uploadSourcemap({ 
    hbEndpoint: HB_ENDPOINT,
    assetsUrl: ASSETS_URL, 
    apiKey: API_KEY, 
    bundle, 
    retries: RETRIES, 
    revision: REVISION
  })
}
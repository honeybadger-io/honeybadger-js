import originalFetch, { FormData, fileFrom } from 'node-fetch'
import fetchRetry from 'fetch-retry';
const fetch = fetchRetry(originalFetch)
import path from 'node:path'

// This could be shared w webpack plugin
async function buildBodyForSourcemapUpload({ 
    assetsUrl, 
    apiKey, 
    revision, 
    jsFilename, 
    jsFilePath,
    sourcemapFilePath, 
  }) {
  const form = new FormData()
  const jsFile = await fileFrom(jsFilePath, 'application/javascript')
  const sourcemapFile = await fileFrom(sourcemapFilePath, 'application/octet-stream')

  form.append('api_key', apiKey)
  form.append('minified_url', `${assetsUrl}/${jsFilename}`)
  form.append('minified_file', jsFile)
  form.append('source_map', sourcemapFile)
  form.append('revision', revision)
  return form
}

/* 
 * The bundle object looks like { [fileName: string]: AssetInfo | ChunkInfo })
 * See https://rollupjs.org/guide/en/#writebundle for details 
**/
export function extractSourcemapDataFromBundle ({ dir = '', bundle }) {
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

// This could be shared with webpack plugin with minor changes
export async function uploadSourcemap ({ 
  hbEndpoint, 
  assetsUrl, 
  apiKey, 
  retries, 
  revision, 
  sourcemapFilename,
  sourcemapFilePath, 
  jsFilename, 
  jsFilePath 
}) {
  const body = await buildBodyForSourcemapUpload({ assetsUrl, apiKey, revision, sourcemapFilePath, jsFilename, jsFilePath })

  let res
  try {
    res = await fetch(hbEndpoint, {
      method: 'POST',
      body,
      redirect: 'follow',
      retries,
      retryDelay: 1000
    })
  } catch (err) {
    // network / operational errors. Does not include 404 / 500 errors
    throw new Error(err, `Failed to upload sourcemap ${sourcemapFilename} to Honeybadger`)
  }

  if (res.ok) {
    console.info(`Successfully uploaded ${sourcemapFilename} to Honeybadger`) 
  } else {
    // Attempt to parse error details from response
    let details
    try {
      const body = await res.json()

      if (body && body.error) {
        details = body.error
      } else {
        details = `${res.status} - ${res.statusText}`
      }
    } catch (parseErr) {
      details = `${res.status} - ${res.statusText}`
    }

    throw new Error(`Failed to upload sourcemap ${sourcemapFilename} to Honeybadger: ${details}`)
  }
}

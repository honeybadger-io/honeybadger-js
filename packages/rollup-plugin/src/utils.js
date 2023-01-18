import originalFetch, { FormData, fileFrom } from 'node-fetch'
import fetchRetry from 'fetch-retry';
const fetch = fetchRetry(originalFetch)

/******************************
 * Everything in this file is designed to be shared with the webpack plugin
 * e.g. by removing specifics about how the bundle is formatted 
 * In a follow-up, we can extract this into a module to share among the plugins
*******************************/

export async function uploadSourcemap ({ 
  endpoint, 
  assetsUrl, 
  apiKey, 
  retries, 
  revision, 
  silent,
  sourcemapFilename,
  sourcemapFilePath, 
  jsFilename, 
  jsFilePath 
}) {
  const body = await buildBodyForSourcemapUpload({ assetsUrl, apiKey, revision, sourcemapFilePath, jsFilename, jsFilePath })

  let res
  try {
    res = await fetch(endpoint, {
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
    if (!silent) {
      console.info(`Successfully uploaded ${sourcemapFilename} to Honeybadger`) 
    }
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

export async function buildBodyForSourcemapUpload({ 
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

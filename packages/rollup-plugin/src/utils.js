import originalFetch, { FormData, fileFrom } from 'node-fetch'
import fetchRetry from 'fetch-retry';
const fetch = fetchRetry(originalFetch)

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

// TODO -- find the right item from bundle dynamically (currently hard-coded for testing)
// Also check what the bundle can look like with multiple JS files
// And can other files be in the bundle besides JS and maps? eg html, css, assets, etc
async function pullDataFromBundle (bundle) {
  const jsFilename = bundle['index.js'].fileName
  const sourcemapFilename = bundle['index.js.map'].fileName
  const jsFilePath = '/Users/bethanyberkowitz/projects/honeybadger/honeybadger-js/packages/rollup-plugin/examples/rollup/dist/index.js'
  const sourcemapFilePath = '/Users/bethanyberkowitz/projects/honeybadger/honeybadger-js/packages/rollup-plugin/examples/rollup/dist/index.js.map'

  return { jsFilename, jsFilePath, sourcemapFilename, sourcemapFilePath }
}

export async function uploadSourcemap ({ hbEndpoint, assetsUrl, apiKey, bundle, retries, revision }) {
  const bundleData = await pullDataFromBundle(bundle)
  let res
  try {
    res = await fetch(hbEndpoint, {
      method: 'POST',
      body: await buildBodyForSourcemapUpload({ assetsUrl, apiKey, revision, ...bundleData }),
      redirect: 'follow',
      retries,
      retryDelay: 1000
    })
  } catch (err) {
    // network / operational errors. Does not include 404 / 500 errors
    throw new Error(err, `Failed to upload sourcemap to Honeybadger`)
  }

  if (!res.ok) {
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

    throw new Error(`Failed to upload sourcemap to Honeybadger: ${details}`)
  }
}

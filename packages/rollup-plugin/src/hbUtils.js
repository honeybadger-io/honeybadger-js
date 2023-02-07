import originalFetch, { FormData, fileFrom } from 'node-fetch'
import fetchRetry from 'fetch-retry';
const fetch = fetchRetry(originalFetch)

/******************************
 * Everything in this file is designed to be shared with the webpack plugin
 * e.g. by removing specifics about how the bundle is formatted 
 * In a follow-up, we can extract this into a module to share among the plugins
*******************************/

/**
 * Uploads sourcemaps to API endpoint
 *
 * @param {Array} sourcemapData An array of sourcemap data, each entry
 *   should look like { sourcemapFilename, sourcemapFilePath, jsFilename, jsFilePath }
 * @param {Object} hbOptions See ./options.js 
 * @returns {Promise} Resolves to an array of Responses if all sourcemaps are uploaded
 * @throws {Error} if any of the sourcemaps fail to upload
 */
export async function uploadSourcemaps({ sourcemapData = [], hbOptions }) {
  if (sourcemapData.length === 0 && !hbOptions.silent) {
    console.warn('Could not find any sourcemaps in the bundle. Nothing will be uploaded.')
  }

  const sourcemapUploadPromises = sourcemapData.map(data => {
    return uploadSourcemap({ 
      ...hbOptions,
      ...data
    })
  })
  
  const results = await Promise.allSettled(sourcemapUploadPromises)
  const fulfilled = results.filter(p => p.status === 'fulfilled')
  const rejected = results.filter(p => p.status === 'rejected')

  if (!hbOptions.silent && fulfilled.length > 0) {
    console.info(`${fulfilled.length} sourcemap file(s) successfully uploaded to Honeybadger`)
  }
  if (rejected.length > 0) {
    const errorsStr = rejected.map(p => p.reason).join('\n')
    throw new Error(`Failed to upload ${rejected.length} sourcemap file(s) to Honeybadger\n${errorsStr}`)
  }
  
  return fulfilled.map(p => p.value)
}

/**
 * Executes an API call to upload a single sourcemap
 *
 * @param {String} endpoint
 * @param {String} assetsUrl
 * @param {String} apiKey 
 * @param {String} revision
 * @param {Boolean} silent
 * @param {String} jsFilename
 * @param {String} jsFilePath
 * @param {String} sourcemapFilePath
 * @returns {Promise} Resolves to an instance of FormData
 *   Rejects with an error if we don't get an ok response
 */
export async function uploadSourcemap ({ 
  endpoint, 
  assetsUrl, 
  apiKey, 
  retries, 
  revision, 
  silent,
  jsFilename, 
  jsFilePath, 
  sourcemapFilename,
  sourcemapFilePath,
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
    throw new Error(`Failed to upload sourcemap ${sourcemapFilename} to Honeybadger: ${err.name}${err.message ? ` - ${err.message}` : ''}`)
  }

  if (res.ok) {
    if (!silent) {
      console.info(`Successfully uploaded ${sourcemapFilename} to Honeybadger`) 
    }
    return res
  } else {
    const details = await parseResErrorDetails(res)
    throw new Error(`Failed to upload sourcemap ${sourcemapFilename} to Honeybadger: ${details}`)
  }
}

/**
 * Builds the form data for the API call
 *
 * @param {String} assetsUrl
 * @param {String} apiKey 
 * @param {String} revision
 * @param {String} jsFilename
 * @param {String} jsFilePath
 * @param {String} sourcemapFilePath
 * @returns {Promise} Resolves to an instance of FormData
 */
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
  const minifiedUrl = new URL(jsFilename, assetsUrl).href

  form.append('api_key', apiKey)
  form.append('minified_url', minifiedUrl)
  form.append('revision', revision)
  form.append('minified_file', jsFile)
  form.append('source_map', sourcemapFile)

  return form
}

export async function sendDeployNotification({
  deployEndpoint,
  deploy, 
  apiKey,
  revision, 
  retries, 
  silent
}) {
  const body = buildBodyForDeployNotification({ deploy, revision })

  let res
  try {
    res = await fetch(deployEndpoint, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body,
      redirect: 'follow',
      retries,
      retryDelay: 1000
    })
  } catch (err) {
    // network / operational errors. Does not include 404 / 500 errors
    throw new Error(`Failed to send deploy notification to Honeybadger: ${err.name}${err.message ? ` - ${err.message}` : ''}`)
  }

  if (res.ok) {
    if (!silent) {
      console.info(`Successfully sent deploy notification to Honeybadger`) 
    }
    return res
  } else {
    const details = await parseResErrorDetails(res)
    throw new Error(`Failed to send deploy notification to Honeybadger: ${details}`)
  }
}

export function buildBodyForDeployNotification({
  deploy, 
  revision
}) {
  let body = {
    deploy: { revision }
  }
  
  if (typeof deploy === 'object') {
    body.deploy.repository = deploy.repository
    body.deploy.local_username = deploy.localUsername
    body.deploy.environment = deploy.environment
  }

  return JSON.stringify(body)
}

export async function parseResErrorDetails(res) {
  let details
  try {
    const body = await res.json()
    if (body && body.error) {
      details = `${res.status} - ${body.error}`
    } else {
      details = `${res.status} - ${res.statusText}`
    }
  } catch (parseErr) {
    details = `${res.status} - ${res.statusText}`
  }

  return details
}

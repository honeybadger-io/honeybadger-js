import { settlePromiseWithWorkers, parseResErrorDetails } from './helpers'
import originalFetch from 'node-fetch'
import FormData from 'form-data'
import { promises as fs } from 'fs'
import fetchRetry from 'fetch-retry'
import path from 'path'
// @ts-expect-error
const fetch = fetchRetry(originalFetch)

import type { HbPluginOptions, SourcemapInfo } from './types'

/**
 * Uploads sourcemaps to API endpoint
 */
export async function uploadSourcemaps(sourcemapData: SourcemapInfo[], hbOptions: HbPluginOptions) {
  if (sourcemapData.length === 0 && !hbOptions.silent) {
    console.warn('Could not find any sourcemaps in the bundle. Nothing will be uploaded.')
    return
  }

  const sourcemapUploadPromises = sourcemapData.map(data => (
    () => { return uploadSourcemap(data, hbOptions) }
  ))
  const results = await settlePromiseWithWorkers(sourcemapUploadPromises, hbOptions.workerCount)
  
  const fulfilled = results.filter((p): p is PromiseFulfilledResult<Response> => p.status === 'fulfilled')
  const rejected = results.filter((p): p is PromiseRejectedResult => p.status === 'rejected')

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
 */
export async function uploadSourcemap (
  sourcemapData: SourcemapInfo, 
  hbOptions: HbPluginOptions
): Promise<Response> {
  const body = await buildBodyForSourcemapUpload(sourcemapData, hbOptions)
  
  let res: Response

  try {
    res = await fetch(hbOptions.endpoint, {
      method: 'POST',
      // @ts-ignore
      body,
      redirect: 'follow',
      retries: hbOptions.retries,
      retryDelay: 1000
    })
  } catch (err) {
    // network / operational errors. Does not include 404 / 500 errors
    throw new Error(`Failed to upload sourcemap ${sourcemapData.sourcemapFilename} to Honeybadger: ${err.name}${err.message ? ` - ${err.message}` : ''}`)
  }

  if (res.ok) {
    if (!hbOptions.silent) {
      console.info(`Successfully uploaded ${sourcemapData.sourcemapFilename} to Honeybadger`) 
    }
    return res
  } else {
    const details = await parseResErrorDetails(res)
    throw new Error(`Failed to upload sourcemap ${sourcemapData.sourcemapFilename} to Honeybadger: ${details}`)
  }
}

/**
 * Builds the form data for the sourcemap API call
 */
export async function buildBodyForSourcemapUpload(
  sourcemapData: SourcemapInfo, 
  hbOptions: HbPluginOptions
): Promise<FormData> {
  const form = new FormData()

  const url = new URL(hbOptions.assetsUrl)
  url.pathname = path.join(url.pathname, sourcemapData.jsFilename)
  const minifiedUrl = url.href

  form.append('api_key', hbOptions.apiKey)
  form.append('minified_url', minifiedUrl)
  form.append('revision', hbOptions.revision)
  form.append('minified_file', await fs.readFile(sourcemapData.jsFilePath), {
    filename: sourcemapData.jsFilename,
    contentType: 'application/javascript'
  })
  form.append('source_map', await fs.readFile(sourcemapData.sourcemapFilePath), {
    filename: sourcemapData.sourcemapFilePath,
    contentType: 'application/octet-stream'
  })

  return form
}





import { parseResErrorDetails } from './helpers'
import originalFetch from 'node-fetch'
import fetchRetry from 'fetch-retry'
// @ts-expect-error
const fetch = fetchRetry(originalFetch)

import type { DeployBody, HbPluginOptions } from './types'

/**
 * Executes an API call to send a deploy notification
 */
export async function sendDeployNotification(hbOptions: HbPluginOptions): Promise<Response> {
  const body = buildBodyForDeployNotification(hbOptions)

  let res: Response
  try {
    res = await fetch(hbOptions.deployEndpoint, {
      method: 'POST',
      headers: {
        'X-API-KEY': hbOptions.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body,
      redirect: 'follow',
      retries: hbOptions.retries,
      retryDelay: 1000
    })
  } catch (err) {
    // network / operational errors. Does not include 404 / 500 errors
    throw new Error(`Failed to send deploy notification to Honeybadger: ${err.name}${err.message ? ` - ${err.message}` : ''}`)
  }

  if (res.ok) {
    if (!hbOptions.silent) {
      console.info('Successfully sent deploy notification to Honeybadger') 
    }
    return res
  } else {
    const details = await parseResErrorDetails(res)
    throw new Error(`Failed to send deploy notification to Honeybadger: ${details}`)
  }
}

/**
 * Builds the JSON body for the deploy notification
 */
export function buildBodyForDeployNotification(hbOptions: HbPluginOptions): string {
  const body: DeployBody = {
    deploy: { revision: hbOptions.revision }
  }
  
  if (typeof hbOptions.deploy === 'object') {
    body.deploy.repository = hbOptions.deploy.repository
    body.deploy.local_username = hbOptions.deploy.localUsername
    body.deploy.environment = hbOptions.deploy.environment
  }

  return JSON.stringify(body)
}



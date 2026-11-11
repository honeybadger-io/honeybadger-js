/**
 * Attempts to parse error details from a non-ok Response
 */
export async function parseResErrorDetails(res: Response): Promise<string> {
  let details: string
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

function* generator (
  promiseFactories: (() => Promise<unknown>)[]
): Generator<[Promise<unknown>, number]> {
  for (let i = 0; i < promiseFactories.length; i++) {
    yield [ promiseFactories[i](), i ]
  }
}

async function worker (
  generator: Generator<[Promise<unknown>, number]>, 
  results: unknown[]
) {
  for (const [promise, index] of generator) {
    try {
      const value = await promise
      results[index] = { status: 'fulfilled', value }
    } catch (err) {
      results[index] = { status: 'rejected', reason: err }
    } 
  }
}

/*
 * Settle promises with a configurable worker count
 * Return value is formatted like Promise.allSettled([...])
**/
export async function settlePromiseWithWorkers (
  promiseFactories: (() => Promise<unknown>)[],
  workerCount: number
): Promise<PromiseSettledResult<unknown>[]> {
  // The generator and the results are shared between workers, ensuring each promise is only resolved once
  const sharedGenerator = generator(promiseFactories)

  const results = []

  // There's no need to create more workers than promises to resolve
  const actualWorkerCount = Math.min(
    workerCount,
    promiseFactories.length
  )

  const workers = Array.from(new Array(actualWorkerCount)).map(() =>
    worker(sharedGenerator, results)
  )

  await Promise.allSettled(workers)

  return results
}

// Responses that usually mean "busy, try again soon"
export const RETRYABLE_STATUSES = [429, 502, 503, 504]
export const BASE_RETRY_DELAY_MS = 1000
export const MAX_BACKOFF_MS = 30 * 1000
export const MAX_RETRY_AFTER_MS = 60 * 1000

// The parts of a fetch Response the retry policy reads (global or node-fetch)
type RetryResponse = {
  status: number;
  headers: { get(name: string): string | null };
  body?: unknown;
}

/**
 * Throw away the body of a response we're about to retry, so its socket is
 * released. Doesn't wait: a server that stalls the body mustn't stall the retry.
 */
function discardBody(response: RetryResponse): void {
  const body = response.body as { resume?: () => void; cancel?: () => Promise<void> } | null | undefined
  try {
    if (body && typeof body.resume === 'function') {
      // node-fetch: a Node stream; flowing with no listener discards the data
      body.resume()
    } else if (body && typeof body.cancel === 'function') {
      // WHATWG fetch: a ReadableStream
      body.cancel().catch(() => undefined)
    }
  } catch (_err) {
    // Nothing to do: we're retrying anyway
  }
}

/**
 * Parses a Retry-After header (delay in seconds, or an HTTP date) into
 * milliseconds. Returns null if absent or invalid.
 */
export function parseRetryAfter(value: string | null | undefined, now: number = Date.now()): number | null {
  if (!value) {
    return null
  }
  const trimmed = value.trim()
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10) * 1000
  }
  // Only accept the three HTTP-date forms (RFC 9110 5.6.7). Date.parse alone
  // accepts things like "1,5" or "-5".
  let dateString: string
  if (/^[A-Za-z]+, .+ \d{2}:\d{2}:\d{2} GMT$/.test(trimmed)) {
    // IMF-fixdate "Sun, 06 Nov 1994 08:49:37 GMT", or RFC 850
    dateString = trimmed
  } else if (/^[A-Za-z]{3} [A-Za-z]{3} +\d{1,2} \d{2}:\d{2}:\d{2} \d{4}$/.test(trimmed)) {
    // asctime "Sun Nov  6 08:49:37 1994" has no zone but means UTC;
    // Date.parse would read it as local time
    dateString = `${trimmed} GMT`
  } else {
    return null
  }
  const date = Date.parse(dateString)
  if (isNaN(date)) {
    return null
  }
  return Math.max(date - now, 0)
}

/**
 * Exponential backoff with jitter, so parallel uploads don't retry in lockstep.
 * Attempt 0 waits 0.5–1s, attempt 1 waits 1–2s, and so on, up to MAX_BACKOFF_MS.
 */
export function backoffDelay(attempt: number, random: () => number = Math.random): number {
  const ceiling = Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, attempt), MAX_BACKOFF_MS)
  return Math.round(ceiling / 2 + random() * ceiling / 2)
}

/**
 * fetch-retry options: retry network errors and RETRYABLE_STATUSES up to
 * `retries` times, waiting for Retry-After when the server sends it.
 * Other responses (e.g. 400, 403, 413) are returned as they are.
 */
export function buildRetryOptions(retries: number, silent: boolean, description: string) {
  return {
    retries,
    retryOn: (attempt: number, error: Error | null, response: RetryResponse | null): boolean => {
      // fetch-retry doesn't apply `retries` when retryOn is a function
      if (!(attempt < retries)) {
        return false
      }
      if (error) {
        return true
      }
      if (!response || RETRYABLE_STATUSES.indexOf(response.status) === -1) {
        return false
      }
      // Don't retry early, and don't stall the build: if the server asks for
      // a longer wait than we're willing to give, fail now.
      const retryAfter = parseRetryAfter(response.headers.get('retry-after'))
      if (retryAfter !== null && retryAfter > MAX_RETRY_AFTER_MS) {
        return false
      }
      // The last response is left unread for the caller's error message
      discardBody(response)
      return true
    },
    retryDelay: (attempt: number, error: Error | null, response: RetryResponse | null): number => {
      const retryAfter = response ? parseRetryAfter(response.headers.get('retry-after')) : null
      const delay = retryAfter !== null ? retryAfter : backoffDelay(attempt)
      if (!silent) {
        const reason = response ? `${response.status}` : (error && error.name) || 'error'
        console.warn(`${description} failed (${reason}); retrying in ${Math.ceil(delay / 1000)}s (retry ${attempt + 1} of ${retries})`)
      }
      return delay
    }
  }
}

function* generator (
  promiseFactories:(() => Promise<unknown>)[]
): Generator<[Promise<any>, number]> {
  for (let i = 0; i < promiseFactories.length; i++) {
    yield [ promiseFactories[i](), i ]
  }
}

async function worker (
  generator:Generator<[Promise<any>, number]>, 
  results:unknown[]
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
  promiseFactories:(() => Promise<unknown>)[],
  workerCount:number
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

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
    results[index] = await promise
  }
}

export async function resolvePromiseWithWorkers (
  promiseFactories:(() => Promise<unknown>)[],
  workerCount:number
) {
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

  await Promise.all(workers)

  return results
}

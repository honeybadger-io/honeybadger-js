function * generator (
  promiseFactories
) {
  for (let i = 0; i < promiseFactories.length; ++i) {
    yield [promiseFactories[i](), i]
  }
}

async function worker (generator, results) {
  for (const [promise, index] of generator) {
    results[index] = await promise
  }
}

export async function resolvePromiseWithWorkers (
  promiseFactories,
  workerCount
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

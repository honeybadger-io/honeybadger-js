import { expect, td } from './testSetup'

import { settlePromiseWithWorkers } from '../src/helpers'

describe('helpers', () => {
  describe('settlePromiseWithWorkers', () => {
    function asyncPromiseGenerator(
      name:string,
      timeout = 1,
      shouldResolve = true,
      traceCallback
    ) {
      return new Promise((resolve, reject) => {
        traceCallback(`start ${name}`)
    
        setTimeout(() => {
          if (shouldResolve) {
            traceCallback(`resolve ${name}`)
            resolve(name)
          } else {
            traceCallback(`reject ${name}`)
            reject(new Error(name))
          }
        }, timeout)
      })
    }
    
    function assertCallSequence (
      spy,
      sequence
    ) {
      const captor = td.matchers.captor()
      td.verify(spy(captor.capture()))
      for (let i = 0; i < sequence.length; ++i) {
        expect(captor.values && captor.values[i]).to.equal(sequence[i])
      }
    }

    let spy
    let promises

    beforeEach(() => {
      spy = td.func()
      promises = [
        () => asyncPromiseGenerator('First', 1, true, spy),
        () => asyncPromiseGenerator('Second', 3, false, spy),
        () => asyncPromiseGenerator('Third', 5, true, spy)
      ]
    })

    afterEach(() => {
      td.reset()
    })

    it('should settle all promises', async function () {
      const results = await settlePromiseWithWorkers(promises, 5)
      expect(results[0]).to.deep.eq({ status: 'fulfilled', value: 'First' })
      const rejected = results[1] as PromiseRejectedResult
      expect(rejected.status).to.eq('rejected')
      expect(rejected.reason.message).to.eq('Second')
      expect(results[2]).to.deep.eq({ status: 'fulfilled', value: 'Third' })
    })

    it('should settle all promises if the number of workers is lower than the number of promises', async function () {
      const results = await settlePromiseWithWorkers(promises, 1)
      expect(results.map(r => r.status)).to.deep.eq([
        'fulfilled', 
        'rejected', 
        'fulfilled',
      ])
    })

    it('should settle the promises sequentially if the number of worker is 1', async function () {
      await settlePromiseWithWorkers(promises, 1)

      const sequence = [
        'start First',
        'resolve First',
        'start Second',
        'reject Second',
        'start Third',
        'resolve Third'
      ]
      assertCallSequence(spy, sequence)
    })

    it('should settle the promises by workers', async function () {
      const promisesWithDelay = [
        () => asyncPromiseGenerator('First', 1, true, spy),
        () =>
          asyncPromiseGenerator(
            'Second',
            50 /* A very long promise that should keep a worker busy */,
            true, 
            spy
          ),
        () => asyncPromiseGenerator('Third', 1, false, spy),
        () => asyncPromiseGenerator('Fourth', 1, true, spy)
      ]

      await settlePromiseWithWorkers(promisesWithDelay, 2)
      const sequence = [
        'start First',
        'start Second',
        'resolve First',
        'start Third',
        'reject Third',
        'start Fourth',
        'resolve Fourth',
        'resolve Second'
      ]
      assertCallSequence(spy, sequence)
    })
  })
})

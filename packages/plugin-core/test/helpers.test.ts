import { expect, td } from './testSetup'

import { resolvePromiseWithWorkers } from '../src/helpers'

describe('helpers', () => {
  describe('resolvePromiseWithWorkers', () => {
    function asyncPromiseGenerator(
      name:string,
      timeout = 1,
      traceCallback?
    ) {
      if (!traceCallback) {
        traceCallback = (str) => (null)
      }
      return new Promise((resolve) => {
        traceCallback(`start ${name}`)
    
        setTimeout(() => {
          traceCallback(`resolve ${name}`)
          resolve(name)
        }, timeout)
      })
    }
    
    function assertCallSequence (
      spy,
      sequence
    ) {
      const captor = td.matchers.captor()
      td.verify(spy(captor.capture()))
      console.log(captor.values)
      for (let i = 0; i < sequence.length; ++i) {
        expect(captor.values && captor.values[i]).to.equal(sequence[i])
        // sinon.assert.calledWith(spy.getCall(i), sequence[i])
      }
    }
    
    const promises = [
      () => asyncPromiseGenerator('First', 1),
      () => asyncPromiseGenerator('Second', 10),
      () => asyncPromiseGenerator('Third', 3)
    ]

    it('should resolve all promises', async function () {
      const results = await resolvePromiseWithWorkers(promises, 5)
      expect(results).to.deep.eq(['First', 'Second', 'Third'])
    })

    it('should resolve all promises if the number of workers is lower than the number of promises', async function () {
      expect(await resolvePromiseWithWorkers(promises, 1))
        .to.deep.eq(['First', 'Second', 'Third'])
    })

    it('should resolve the promises sequentially if the number of worker is 1', async function () {
      const spy = td.func()
      const promisesWithCallback = [
        () => asyncPromiseGenerator('First', 1, spy),
        () => asyncPromiseGenerator('Second', 3, spy),
        () => asyncPromiseGenerator('Third', 5, spy)
      ]

      await resolvePromiseWithWorkers(promisesWithCallback, 1)

      const sequence = [
        'start First',
        'resolve First',
        'start Second',
        'resolve Second',
        'start Third',
        'resolve Third'
      ]
      assertCallSequence(spy, sequence)
    })

    it('should resolve the promises by workers', async function () {
      const spy = td.func()
      const promisesWithCallback = [
        () => asyncPromiseGenerator('First', 1, spy),
        () =>
          asyncPromiseGenerator(
            'Second',
            50 /* A very long promise that should keep a worker busy */,
            spy
          ),
        () => asyncPromiseGenerator('Third', 1, spy),
        () => asyncPromiseGenerator('Fourth', 1, spy)
      ]

      await resolvePromiseWithWorkers(promisesWithCallback, 2)
      const sequence = [
        'start First',
        'start Second',
        'resolve First',
        'start Third',
        'resolve Third',
        'start Fourth',
        'resolve Fourth',
        'resolve Second'
      ]
      assertCallSequence(spy, sequence)
    })
  })
})

/* eslint-env mocha */

import chai from 'chai'
import * as sinon from 'sinon'

import { resolvePromiseWithWorkers } from '../src/resolvePromiseWithWorkers'

const expect = chai.expect

function asyncPromiseGenerator (
  name,
  timeout,
  traceCallback
) {
  return new Promise((resolve) => {
    if (typeof traceCallback === 'function') {
      traceCallback(`start ${name}`)
    }

    setTimeout(() => {
      if (typeof traceCallback === 'function') {
        traceCallback(`resolve ${name}`)
      }
      resolve(name)
    }, timeout)
  })
}

function assertCallSequence (
  spy,
  sequence
) {
  for (let i = 0; i < sequence.length; ++i) {
    sinon.assert.calledWith(spy.getCall(i), sequence[i])
  }
}

const promises = [
  () => asyncPromiseGenerator('First', 1),
  () => asyncPromiseGenerator('Second', 10),
  () => asyncPromiseGenerator('Third', 3)
]

describe('resolvePromiseWithWorkers', function () {
  it('should resolve all promises', async function () {
    expect(await resolvePromiseWithWorkers(promises, 5))
      .to.deep.eq(['First', 'Second', 'Third'])
  })

  it('should resolve all promises if the number of workers is lower than the number of promises', async function () {
    expect(await resolvePromiseWithWorkers(promises, 1))
      .to.deep.eq(['First', 'Second', 'Third'])
  })

  it('should resolve the promises sequentially if the number of worker is 1', async function () {
    const spy = sinon.spy()
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
    const spy = sinon.spy()
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

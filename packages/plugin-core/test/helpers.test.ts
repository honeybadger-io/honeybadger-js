import { expect, td } from './testSetup'

import { Response } from 'node-fetch'
import {
  settlePromiseWithWorkers,
  parseRetryAfter,
  backoffDelay,
  buildRetryOptions,
  MAX_RETRY_AFTER_MS,
  MAX_BACKOFF_MS
} from '../src/helpers'

describe('helpers', () => {
  describe('settlePromiseWithWorkers', () => {
    function asyncPromiseGenerator(
      name: string,
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

  describe('parseRetryAfter', () => {
    const now = Date.parse('2026-01-01T00:00:00Z')

    it('should parse a delay in seconds', () => {
      expect(parseRetryAfter('5', now)).to.equal(5000)
      expect(parseRetryAfter(' 0 ', now)).to.equal(0)
    })

    it('should parse an HTTP date', () => {
      expect(parseRetryAfter('Thu, 01 Jan 2026 00:00:10 GMT', now)).to.equal(10000)
    })

    it('should not return a negative delay for a past date', () => {
      expect(parseRetryAfter('Wed, 31 Dec 2025 23:59:00 GMT', now)).to.equal(0)
    })

    it('should not cap long delays', () => {
      expect(parseRetryAfter('3600', now)).to.equal(3600 * 1000)
    })

    it('should accept the RFC 850 date form', () => {
      expect(parseRetryAfter('Thursday, 01-Jan-26 00:00:10 GMT', now)).to.equal(10000)
    })

    it('should return null when missing or invalid', () => {
      expect(parseRetryAfter(null, now)).to.equal(null)
      expect(parseRetryAfter('', now)).to.equal(null)
      expect(parseRetryAfter('soon', now)).to.equal(null)
      expect(parseRetryAfter('-5', now)).to.equal(null)
      expect(parseRetryAfter('1.5', now)).to.equal(null)
      expect(parseRetryAfter('1,5', now)).to.equal(null)
      expect(parseRetryAfter('1/2', now)).to.equal(null)
      expect(parseRetryAfter('2026-01-01', now)).to.equal(null)
    })
  })

  describe('backoffDelay', () => {
    it('should double each attempt, with jitter in the upper half', () => {
      expect(backoffDelay(0, () => 0)).to.equal(500)
      expect(backoffDelay(0, () => 1)).to.equal(1000)
      expect(backoffDelay(2, () => 0)).to.equal(2000)
      expect(backoffDelay(2, () => 1)).to.equal(4000)
    })

    it('should cap the delay', () => {
      expect(backoffDelay(20, () => 1)).to.equal(MAX_BACKOFF_MS)
    })
  })

  describe('buildRetryOptions', () => {
    afterEach(() => td.reset())

    it('should retry network errors and busy responses until retries run out', () => {
      const { retries, retryOn } = buildRetryOptions(2, true, 'Testing')
      expect(retries).to.equal(2)
      expect(retryOn(0, new Error('boom'), null)).to.equal(true)
      expect(retryOn(0, null, new Response('', { status: 429 }))).to.equal(true)
      expect(retryOn(0, null, new Response('', { status: 502 }))).to.equal(true)
      expect(retryOn(1, null, new Response('', { status: 503 }))).to.equal(true)
      expect(retryOn(1, null, new Response('', { status: 504 }))).to.equal(true)
      expect(retryOn(2, null, new Response('', { status: 503 }))).to.equal(false)
      expect(retryOn(2, new Error('boom'), null)).to.equal(false)
    })

    it('should not retry when Retry-After asks for more than the cap', () => {
      const { retryOn } = buildRetryOptions(3, true, 'Testing')
      const tooLong = String(MAX_RETRY_AFTER_MS / 1000 + 1)
      const atCap = String(MAX_RETRY_AFTER_MS / 1000)
      expect(retryOn(0, null, new Response('', { status: 503, headers: { 'Retry-After': tooLong } }))).to.equal(false)
      expect(retryOn(0, null, new Response('', { status: 503, headers: { 'Retry-After': atCap } }))).to.equal(true)
    })

    it('should not retry successes or other errors', () => {
      const { retryOn } = buildRetryOptions(3, true, 'Testing')
      ;[200, 201, 400, 401, 403, 404, 413, 422, 500].forEach(status => {
        expect(retryOn(0, null, new Response('', { status }))).to.equal(false)
      })
    })

    it('should not retry when retries is 0', () => {
      const { retryOn } = buildRetryOptions(0, true, 'Testing')
      expect(retryOn(0, new Error('boom'), null)).to.equal(false)
      expect(retryOn(0, null, new Response('', { status: 503 }))).to.equal(false)
    })

    it('should wait for Retry-After when present', () => {
      const { retryDelay } = buildRetryOptions(3, true, 'Testing')
      const res = new Response('', { status: 503, headers: { 'Retry-After': '7' } })
      expect(retryDelay(0, null, res)).to.equal(7000)
    })

    it('should back off when there is no Retry-After', () => {
      const { retryDelay } = buildRetryOptions(3, true, 'Testing')
      const delay = retryDelay(1, null, new Response('', { status: 503 }))
      expect(delay).to.be.within(1000, 2000)
      expect(retryDelay(0, new Error('boom'), null)).to.be.within(500, 1000)
    })

    it('should log each retry unless silent', () => {
      const warn = td.replace(console, 'warn')
      const res = new Response('', { status: 503, headers: { 'Retry-After': '2' } })

      buildRetryOptions(3, false, 'Uploading x.map').retryDelay(0, null, res)
      td.verify(warn('Uploading x.map failed (503); retrying in 2s (retry 1 of 3)'))

      buildRetryOptions(3, true, 'Uploading x.map').retryDelay(0, null, res)
      td.verify(warn(td.matchers.anything()), { times: 1 })
    })
  })
})

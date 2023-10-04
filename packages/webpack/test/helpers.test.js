/* eslint-env mocha */

import chai from 'chai'
import * as helpers from '../src/helpers'

const expect = chai.expect

describe('helpers', function () {
  describe('handleError', function () {
    it('should return an array of length 1 given a single error', function () {
      const result = helpers.handleError(new Error('required field missing'))
      expect(result).to.be.an.instanceof(Array)
      expect(result.length).to.eq(1)
    })

    it('should return an array of length 2 given an array of length 2', function () {
      const result = helpers.handleError([
        new Error('required field missing'),
        new Error('request failed')
      ])
      expect(result).to.an.instanceof(Array)
      expect(result.length).to.eq(2)
    })

    it('should prefix message of single error', function () {
      const result = helpers.handleError(new Error('required field missing'), 'Plugin')
      expect(result.length).to.eq(1)
      expect(result[0]).to.include({ message: 'Plugin: required field missing' })
    })

    it('should prefix message of an array of errors', function () {
      const result = helpers.handleError([
        new Error('required field missing'),
        new Error('request failed')
      ], 'Plugin')
      expect(result.length).to.eq(2)
      expect(result[0]).to.include({ message: 'Plugin: required field missing' })
    })

    it('should default prefix to "HoneybadgerSourceMapPlugin"', function () {
      const result = helpers.handleError(new Error('required field missing'))
      expect(result.length).to.eq(1)
      expect(result[0]).to.include({
        message: 'HoneybadgerSourceMapPlugin: required field missing'
      })
    })

    it('should handle null', function () {
      const result = helpers.handleError(null)
      expect(result).to.be.an('array')
      expect(result.length).to.eq(0)
    })

    it('should handle empty []', function () {
      const result = helpers.handleError([])
      expect(result).to.be.an('array')
      expect(result.length).to.eq(0)
    })
  })
})

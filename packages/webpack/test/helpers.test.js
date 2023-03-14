/* eslint-env mocha */

import chai from 'chai'
import { REQUIRED_FIELDS } from '../src/constants'
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

  describe('validateOptions', function () {
    it('should return null if all required options are supplied', function () {
      const options = {
        apiKey: 'abcd1234',
        revision: 'fab5a8727c70647dcc539318b5b3e9b0cb8ae17b',
        assetsUrl: 'https://cdn.example.com/assets'
      }
      const result = helpers.validateOptions(options)
      expect(result).to.eq(null)
    })

    it('should return an error if apiKey is not supplied', function () {
      const options = {
        revision: 'fab5a8727c70647dcc539318b5b3e9b0cb8ae17b',
        assetsUrl: 'https://cdn.example.com/assets'
      }
      const result = helpers.validateOptions(options)
      expect(result).to.be.an.instanceof(Array)
      expect(result.length).to.eq(1)
      expect(result[0]).to.be.an.instanceof(Error)
      expect(result[0]).to.include({ message: 'required field, \'apiKey\', is missing.' })
    })

    it('should return an error if assetsUrl is not supplied', function () {
      const options = {
        apiKey: 'abcd1234',
        revision: 'fab5a8727c70647dcc539318b5b3e9b0cb8ae17b'
      }
      const result = helpers.validateOptions(options)
      expect(result).to.be.an.instanceof(Array)
      expect(result.length).to.eq(1)
      expect(result[0]).to.be.an.instanceof(Error)
      expect(result[0]).to.include({ message: 'required field, \'assetsUrl\', is missing.' })
    })

    it('should handle multiple missing required options', function () {
      const options = {}
      const result = helpers.validateOptions(options)
      expect(result).to.be.an.instanceof(Array)
      expect(result.length).to.eq(REQUIRED_FIELDS.length)
    })

    it('should handle null for options', function () {
      const result = helpers.validateOptions(null)
      expect(result).to.be.an.instanceof(Array)
      expect(result.length).to.eq(REQUIRED_FIELDS.length)
    })

    it('should handle no options passed', function () {
      const result = helpers.validateOptions()
      expect(result).to.be.an.instanceof(Array)
      expect(result.length).to.eq(REQUIRED_FIELDS.length)
    })
  })
})

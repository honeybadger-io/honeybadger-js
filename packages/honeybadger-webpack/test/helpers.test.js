import expect from 'expect';
import { REQUIRED_FIELDS } from '../src/constants';
import * as helpers from '../src/helpers';

describe('helpers', function() {
  describe('handleError', function() {
    it('should return an array of length 1 given a single error', function() {
      const result = helpers.handleError(new Error('required field missing'));
      expect(result).toBeA(Array);
      expect(result.length).toEqual(1);
    });

    it('should return an array of length 2 given an array of length 2', function() {
      const result = helpers.handleError([
        new Error('required field missing'),
        new Error('request failed')
      ]);
      expect(result).toBeA(Array);
      expect(result.length).toEqual(2);
    });

    it('should prefix message of single error', function() {
      const result = helpers.handleError(new Error('required field missing'), 'Plugin');
      expect(result.length).toEqual(1);
      expect(result[0]).toInclude({ message: 'Plugin: required field missing' });
    });

    it('should prefix message of an array of errors', function() {
      const result = helpers.handleError([
        new Error('required field missing'),
        new Error('request failed')
      ], 'Plugin');
      expect(result.length).toEqual(2);
      expect(result[0]).toInclude({ message: 'Plugin: required field missing' });
    });

    it('should default prefix to "HoneybadgerSourceMapPlugin"', function() {
      const result = helpers.handleError(new Error('required field missing'));
      expect(result.length).toEqual(1);
      expect(result[0]).toInclude({
        message: 'HoneybadgerSourceMapPlugin: required field missing'
      });
    });

    it('should handle null', function() {
      const result = helpers.handleError(null);
      expect(result).toEqual([]);
    });

    it('should handle empty []', function() {
      const result = helpers.handleError([]);
      expect(result).toEqual([]);
    });
  });

  describe('validateOptions', function() {
    it('should return null if all required options are supplied', function() {
      const options = {
        api_key: 'abcd1234',
        revision: 'fab5a8727c70647dcc539318b5b3e9b0cb8ae17b',
        assets_url: 'https://cdn.example.com/assets',
      };
      const result = helpers.validateOptions(options);
      expect(result).toBe(null); // eslint-disable-line no-unused-expressions
    });

    it('should return an error if api_key is not supplied', function() {
      const options = {
        revision: 'fab5a8727c70647dcc539318b5b3e9b0cb8ae17b',
        assets_url: 'https://cdn.example.com/assets',
      };
      const result = helpers.validateOptions(options);
      expect(result).toBeA('array');
      expect(result.length).toBe(1);
      expect(result[0]).toBeA(Error)
        .toInclude({ message: 'required field, \'api_key\', is missing.' });
    });

    it('should return an error if assets_url is not supplied', function() {
      const options = {
        api_key: 'abcd1234',
        revision: 'fab5a8727c70647dcc539318b5b3e9b0cb8ae17b',
      };
      const result = helpers.validateOptions(options);
      expect(result).toBeA('array');
      expect(result.length).toBe(1);
      expect(result[0]).toBeA(Error)
        .toInclude({ message: 'required field, \'assets_url\', is missing.' });
    });

    it('should handle multiple missing required options', function() {
      const options = {};
      const result = helpers.validateOptions(options);
      expect(result).toBeA(Array);
      expect(result.length).toBe(REQUIRED_FIELDS.length);
    });

    it('should handle null for options', function() {
      const result = helpers.validateOptions(null);
      expect(result).toBeA(Array);
      expect(result.length).toBe(REQUIRED_FIELDS.length);
    });

    it('should handle no options passed', function() {
      const result = helpers.validateOptions();
      expect(result).toBeA(Array);
      expect(result.length).toBe(REQUIRED_FIELDS.length);
    });
  });
});

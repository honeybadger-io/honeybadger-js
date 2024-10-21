import { expect } from './testSetup'
import {
  MAX_RETRIES,
  DEFAULT_ENDPOINT,
  DEFAULT_REVISION,
  DEFAULT_SILENT,
  DEFAULT_DEPLOY_ENDPOINT,
  cleanOptions,
  DEFAULT_IGNORE_ERRORS,
  DEFAULT_WORKER_COUNT,
  MIN_WORKER_COUNT,
  DEFAULT_DEVELOPMENT_ENVIRONMENTS,
} from '../src/options';

describe('Options', () => {
  describe('cleanOptions', () => {
    it('should error if a required field is missing', () => {
      expect(cleanOptions.bind(cleanOptions, {})).to.throw('apiKey is required')
    });

    it('should error if ignorePaths is not an array', () => {
      expect(cleanOptions.bind(cleanOptions, {
        apiKey: 'test_key',
        assetsUrl: 'https://foo.bar',
        ignorePaths: 'foo'
      })).to.throw('ignorePaths must be an array')
    });

    it('should not allow retries above the MAX_RETRIES', () => {
      const result = cleanOptions({
        apiKey: 'test_key',
        assetsUrl: 'https://foo.bar',
        retries: 100
      })
      expect(result.retries).to.equal(MAX_RETRIES)
    })

    it('should not allow worker count below MIN_WORKER_COUNT', () => {
      const result = cleanOptions({
        apiKey: 'test_key',
        assetsUrl: 'https://foo.bar',
        workerCount: 0
      })
      expect(result.workerCount).to.equal(MIN_WORKER_COUNT)
    })

    it('should merge in default options', () => {
      const result = cleanOptions({
        apiKey: 'test_key',
        assetsUrl: 'https://foo.bar',
        retries: 0,
        deploy: { localUsername: 'BethanyBerkowitz' },
      })
      expect(result).to.deep.equal({
        apiKey: 'test_key',
        assetsUrl: 'https://foo.bar',
        retries: 0,
        endpoint: DEFAULT_ENDPOINT,
        revision: DEFAULT_REVISION,
        silent: DEFAULT_SILENT,
        deploy: { localUsername: 'BethanyBerkowitz' },
        deployEndpoint: DEFAULT_DEPLOY_ENDPOINT,
        ignorePaths: [],
        ignoreErrors: DEFAULT_IGNORE_ERRORS,
        workerCount: DEFAULT_WORKER_COUNT,
        developmentEnvironments: DEFAULT_DEVELOPMENT_ENVIRONMENTS,
      })
    })
  });
});

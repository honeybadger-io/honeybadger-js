import { expect } from 'chai'
import { 
  MAX_RETRIES, 
  DEFAULT_ENDPOINT, 
  DEFAULT_REVISION, 
  DEFAULT_SILENT,
  DEPLOY_ENDPOINT,
  cleanOptions, 
} from '../src/options';

describe('Options', () => {
  describe('cleanOptions', () => {
    it('should error if a required field is missing', () => {
      expect(cleanOptions.bind(cleanOptions, {})).to.throw('apiKey is required')
    });

    it('should not allow retries above the MAX_RETRIES', () => {
      const result = cleanOptions({ 
        apiKey: 'test_key', 
        assetsUrl: 'https://foo.bar',
        retries: 100 
      })
      expect(result.retries).to.equal(MAX_RETRIES)
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
        deployEndpoint: DEPLOY_ENDPOINT,
      })
    })
  });
});
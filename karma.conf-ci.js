module.exports = function(config) {

  // Browsers to run on Sauce Labs
  var customLaunchers = {
    bs_safari: {
      base: 'BrowserStack',
      browser: 'Safari',
      browser_version: 'latest',
      os: 'OS X',
      os_version: 'Mojave'
    },
    bs_chrome: {
      base: 'BrowserStack',
      browser: 'Chrome',
      browser_version: 'latest',
      os: 'Windows',
      os_version: '10'
    },
    bs_firefox: {
      base: 'BrowserStack',
      browser: 'Firefox',
      browser_version: '64.0',
      os: 'Windows',
      os_version: '10'
    },
    bs_edge: {
      base: 'BrowserStack',
      browser: 'Edge',
      os: 'Windows',
      os_version: '10'
    },
    bs_ie11: {
      base: 'BrowserStack',
      browser: 'IE',
      browser_version: '11',
      os: 'Windows',
      os_version: '8.1'
    },
  };

  config.set({
    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    // Required for BrowserStack
    hostname: 'bs-local.com',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine', 'sinon'],


    // list of files / patterns to load in the browser
    files: [
      // polyfills
      'node_modules/promise-polyfill/dist/polyfill.js',
      'node_modules/whatwg-fetch/dist/fetch.umd.js',

      // Spec files
      { pattern: 'spec/**/*.spec.js' },

      // Integration sandbox
      { pattern: 'spec/sandbox.html', included: false },
      { pattern: 'dist/honeybadger.js', included: false }
    ],

    proxies: {
      // Used in integration tests; send to sandbox file for now since the
      // response body doesn't matter. May change later.
      '/example/path': '/base/spec/sandbox.html'
    },

    preprocessors: {
      'spec/**/*.spec.js': ['rollup']
    },

    rollupPreprocessor: {
      /**
       * This is just a normal Rollup config object,
       * except that `input` is handled for you.
       */
      plugins: [require('rollup-plugin-node-resolve')(), require('rollup-plugin-commonjs')(), require('rollup-plugin-babel')()],
      output: {
        format: 'iife',      // Helps prevent naming collisions.
        name: 'honeybadger', // Required for 'iife' format.
        sourcemap: 'inline'  // Sensible for testing.
      }
    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['dots', 'BrowserStack'],


    // web server port
    port: 9876,

    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    customLaunchers: customLaunchers,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: Object.keys(customLaunchers),

    singleRun: true,
    autoWatch: false,

    concurrency: 2,

    browserDisconnectTolerance: 5,
    retryLimit: 5,

    browserSocketTimeout: 120000,
    browserNoActivityTimeout: 120000,
    captureTimeout: 120000,
  });
};

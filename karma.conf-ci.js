module.exports = function(config) {

  // Browsers to run on Sauce Labs
  var customLaunchers = {
    'SL_Safari': {
      base: 'SauceLabs',
      browserName: 'safari',
      platform: 'OS X 10.12',
      version: '11.0'
    },
    'SL_Chrome': {
      base: 'SauceLabs',
      browserName: 'chrome',
      version: 'latest',
      platform: 'Windows 10'
    },
    'SL_Firefox': {
      base: 'SauceLabs',
      browserName: 'firefox',
      version: '64.0',
      platform: 'Windows 10'
    },
    'SL_Edge': {
      base: 'SauceLabs',
      browserName: 'MicrosoftEdge',
      platform: 'Windows 10'
    },
    'SL_InternetExplorer': {
      base: 'SauceLabs',
      browserName: 'internet explorer',
      version: '11.0',
      platform: 'Windows 8.1'
    },
    'SL_InternetExplorer': {
      base: 'SauceLabs',
      browserName: 'internet explorer',
      version: '10.0',
      platform: 'Windows 8'
    }
  };

  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine', 'sinon'],


    // list of files / patterns to load in the browser
    files: [
      'node_modules/babel-polyfill/dist/polyfill.js',

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
    reporters: ['dots', 'saucelabs'],


    // web server port
    port: 9876,

    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    sauceLabs: {
      testName: 'honeybadger.js karma runner'
    },
    captureTimeout: 120000,
    customLaunchers: customLaunchers,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: Object.keys(customLaunchers),

    singleRun: true,
    autoWatch: false,

    concurrency: 2
  });
};

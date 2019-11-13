// Karma configuration
// Generated on Fri Mar 15 2019 21:04:41 GMT-0700 (Pacific Daylight Time)

process.env.CHROME_BIN = require('puppeteer').executablePath();

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine', 'sinon'],


    // list of files / patterns to load in the browser
    files: [
      /**
       * Make sure to disable Karma’s file watcher
       * because the preprocessor will use its own.
       */

      // polyfills
      'node_modules/promise-polyfill/dist/polyfill.js',
      'node_modules/whatwg-fetch/dist/fetch.umd.js',

      // Spec files
      { pattern: 'spec/**/*.spec.js', watched: false },

      // Integration sandbox
      { pattern: 'spec/sandbox.html', watched: false, included: false },
      { pattern: 'dist/honeybadger.js', watched: false, included: false }
    ],


    proxies: {
      // Used in integration tests; send to sandbox file for now since the
      // response body doesn't matter. May change later.
      '/example/path': '/base/spec/sandbox.html'
    },


    // list of files / patterns to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
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
    reporters: ['progress'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['ChromeHeadless'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity
  });
};

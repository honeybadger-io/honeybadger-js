// I'm getting local timeout errors when this is enabled
// process.env.CHROME_BIN = require('puppeteer').executablePath()

const availableBrowsers = require('./browsers.js')
let browsers = {}
if (process.env.BROWSERS) {
  process.env.BROWSERS.split(/\s*,\s*/).forEach((key) => {
    if (key in availableBrowsers) {
      browsers[key] = availableBrowsers[key]
    }
  })
} else {
  browsers = availableBrowsers
}

module.exports = function (config) {
  config.set({
    port: 9876,
    basePath: '../../',
    colors: true,
    autoWatch: false,
    singleRun: true,
    logLevel: config.LOG_INFO,
    files: [
      // The test file
      'test/integration/test.js',

      // Web Worker
      { pattern: 'test/integration/worker.js', included: false },

      // File being tested
      { pattern: 'dist/browser/honeybadger.js', included: false },

      // Integration sandbox
      { pattern: 'test/integration/sandbox.html', included: false },

      // User Feedback Form asset
      { pattern: 'dist/browser/honeybadger-feedback-form.js', included: false },
    ],
    frameworks: ['jasmine', 'jasmine-matchers'],
  })

  if (process.env.HEADLESS === '1') {
    config.set({
      reporters: ['dots'],
      browsers: ['ChromeHeadless'],
    })
  } else {
    if (Object.keys(browsers).length === 0) {
      console.warn('No valid browsers detected; exiting.');
      process.exit();
    }

    config.set({
      customLaunchers: browsers,
      browsers: Object.keys(browsers),
      reporters: ['dots', 'BrowserStack'],
      browserStack: {
        project: 'honeybadger-universal-js',
        build: 'integration'
      },
      hostname: 'bs-local.com',
      concurrency: 2,
      browserDisconnectTolerance: 5,
      retryLimit: 5,
      browserSocketTimeout: 120000,
      browserNoActivityTimeout: 120000,
      captureTimeout: 120000
    })
  }
}

// For authoring Nightwatch tests, see
// http://nightwatchjs.org/guide#usage

module.exports = {
  'default e2e tests': function (browser) {
    // automatically uses dev Server port from /config.index.js
    // default: http://localhost:8080
    // see nightwatch.conf.js
    const devServer = browser.globals.devServerURL
    browser
      .url(devServer)
      .waitForElementVisible('#componentErrantButton', 5000)
      .waitForXHR('', 5000, function browserTrigger () {
        browser.click('#componentErrantButton')
      }, function assertValues (xhrs) {
        browser.assert.equal(xhrs[0].httpResponseCode, '201')
      })
      .end()
  }
}

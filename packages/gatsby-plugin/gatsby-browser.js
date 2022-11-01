const Honeybadger = require('@honeybadger-io/js')

exports.onClientEntry = function(_, { apiKey, revision, environment = process.env.NODE_ENV }) {
  if (!apiKey) {
    console.warn('gatsby-plugin-honeybadger needs an API key to be configured properly {url for documentation}')
    return
  }

  Honeybadger.configure({
    apiKey,
    revision,
    environment
  })
}
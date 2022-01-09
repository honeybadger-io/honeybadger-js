const Honeybadger = require('@honeybadger-io/js')

Honeybadger.configure({
  environment: 'aws-lambda',
  debug: true,
  apiKey: process.env.HONEYBADGER_API_KEY
})

module.exports.honeybadgerWrapper = (handler) => {
  return Honeybadger.lambdaHandler(handler);
}
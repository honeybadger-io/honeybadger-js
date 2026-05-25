const Honeybadger = require('@honeybadger-io/js')

Honeybadger.configure({
  environment: 'aws-lambda',
  debug: true,
  apiKey: process.env.HONEYBADGER_API_KEY,
  eventsEnabled: true,
  insights: { enabled: true, http: true }
})

module.exports.honeybadgerWrapper = (handler) => {
  return Honeybadger.lambdaHandler(handler);
}
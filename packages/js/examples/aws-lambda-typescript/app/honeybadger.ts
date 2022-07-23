import Honeybadger from '@honeybadger-io/js'

Honeybadger.configure({
  environment: 'aws-lambda-typescript',
  debug: true,
  apiKey: process.env.HONEYBADGER_API_KEY
})

export default (handler) => {
  return Honeybadger.lambdaHandler(handler);
}

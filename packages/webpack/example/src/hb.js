const Honeybadger = require('@honeybadger-io/js');

Honeybadger.configure({
  apiKey: process.env.HONEYBADGER_API_KEY,
  revision: process.env.HONEYBADGER_REVISION,
})

export default Honeybadger
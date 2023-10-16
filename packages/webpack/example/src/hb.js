const Honeybadger = require('@honeybadger-io/js');

Honeybadger.configure({
  apiKey: (prompt('Enter the API key for your Honeybadger project:')),
})

export default Honeybadger
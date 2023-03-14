
const Honeybadger = require('../../../dist/server/honeybadger.js')
Honeybadger.configure({});

module.exports.http = {

  middleware: {

    order: [
      'honeybadgerContext',
      'cookieParser',
      'session',
      'bodyParser',
      'compress',
      'poweredBy',
      'router',
      'www',
      'favicon',
      'honeybadgerErrors',
    ],

    honeybadgerContext: Honeybadger.requestHandler,
    honeybadgerErrors: Honeybadger.errorHandler,
  },

};

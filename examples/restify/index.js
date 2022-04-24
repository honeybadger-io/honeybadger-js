let restify = require('restify');
const Honeybadger = require('../../dist/server/honeybadger.js')
Honeybadger.configure({});

let server = restify.createServer();

server.use(Honeybadger.requestHandler)

server.get('/unhandled', (_req, _res, _next) => {
  Honeybadger.setContext({
    user_id: '8yf84'
  });
  throw new Error('Unhandled error. Should be reported on Honeybadger dashboard');
});

server.get('/report', (req, res, next) => {
  Honeybadger.notify('Hello World!');
  res.send('Message should have been reported to Honeybadger! Please check your Honeybadger dashboard.');
  next(false);
});

server.on('restifyError', Honeybadger.errorHandler);

server.listen(3000, function () {
  console.log('%s listening at http://localhost:3000', server.name);
});

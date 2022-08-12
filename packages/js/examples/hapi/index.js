const Honeybadger = require('../../dist/server/honeybadger.js')
Honeybadger.configure({});

const Hapi = require('@hapi/hapi');

const server = Hapi.server({
  port: 3000,
  host: 'localhost'
});

server.route({
  method: 'GET',
  path: '/unhandled',
  handler: async (request, _h) => Honeybadger.withRequest(request, () => {
    Honeybadger.setContext({
      user_id: '8yf84'
    });
    throw new Error('Unhandled error. Should be reported on Honeybadger dashboard');
  })
});

server.route({
  method: 'GET',
  path: '/report',
  handler: async (request, _h) => Honeybadger.withRequest(request, () => {
    Honeybadger.notify('Hello World!');
    return 'Message should have been reported to Honeybadger! Please check your Honeybadger dashboard.';
  })
});

server.ext('onPreResponse', (request, h) => Honeybadger.withRequest(request, () => {
  const isError = request.response.isBoom && request.response.isServer;
  if (!isError) {
    return h.continue;
  }

  Honeybadger.notify(request.response);
  return h.continue;
}));

server.start().then(() => {
  console.log('Server running on %s', server.info.uri);
});

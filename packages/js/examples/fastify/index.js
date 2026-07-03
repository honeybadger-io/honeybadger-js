const fastify = require('fastify')({ logger: false })
const Honeybadger = require('../../dist/server/honeybadger.js')
const { fastifyPlugin } = require('../../dist/server/fastify.js')

Honeybadger.configure({
  apiKey: process.env.HONEYBADGER_API_KEY,
  insights: {
    enabled: true,
    http: true,
  },
  debug: true,
});

fastify.register(fastifyPlugin(Honeybadger));

fastify.setErrorHandler((err, req, reply) => Honeybadger.withRequest(req, () => {
  Honeybadger.notify(err)
  reply.send('NOT OK')
}));

fastify.get('/unhandled', (_request, _reply) => {
  Honeybadger.setContext({
    user_id: '8yf84'
  });
  throw new Error('Unhandled error. Should be reported on Honeybadger dashboard');
});

fastify.get('/report', (request, reply) => {
  Honeybadger.notify('Hello World!');
  reply.send('Message should have been reported to Honeybadger! Please check your Honeybadger dashboard.');
});

fastify.get('/event', (request, reply) => {
  // Programmatic events always ship and carry the request's
  // request_id / correlation_id seeded by the plugin.
  Honeybadger.event('custom.fastify', { msg: 'Hello World!' });
  reply.send('Event should appear in Honeybadger Insights with request_id and correlation_id.');
});

fastify.listen(3000, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  console.log(`Server is now listening on ${address}`);
})

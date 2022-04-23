const fastify = require('fastify')({ logger: false })
const Honeybadger = require('../../dist/server/honeybadger.js')
Honeybadger.configure({});

fastify.addHook('preHandler', Honeybadger.requestHandler);

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

fastify.listen(3000, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  console.log(`Server is now listening on ${address}`);
})

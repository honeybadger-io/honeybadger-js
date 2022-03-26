const fastify = require('fastify')({logger: false})
const Honeybadger = require("../../dist/server/honeybadger.js")
Honeybadger.configure({});

fastify.addHook('preHandler', Honeybadger.requestHandler);

fastify.setErrorHandler((err, req, reply) => Honeybadger.withRequest(req, () => {
    Honeybadger.notify(err)
    reply.send("NOT OK")
}));

let reqId = 0;
fastify.get('/test-context', function (request, reply) {
    const localReqId = ++reqId;
    Honeybadger.setContext({
        [localReqId]: true
    })

    console.log(Honeybadger.__store.getStore().context);

    if (localReqId === 2) {
        setTimeout(() => {
            throw new Error('Badgers!')
        }, 100);
    } else {
        setTimeout(() => {
            console.log(`Done: ${localReqId}`)
            reply.send("OKK");
        }, 100);
    }
});

fastify.listen(3000, function (err, address) {
    if (err) {
        fastify.log.error(err)
        process.exit(1)
    }
    console.log(`Server is now listening on ${address}`);
})
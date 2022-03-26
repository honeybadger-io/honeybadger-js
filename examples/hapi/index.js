const {setTimeout} = require("node:timers/promises");

const Honeybadger = require("../../dist/server/honeybadger.js")
Honeybadger.configure({});

const Hapi = require('@hapi/hapi');

const server = Hapi.server({
    port: 3000,
    host: 'localhost'
});

let reqId = 0;
server.route({
    method: 'GET',
    path: '/test-context',
    handler: async (request, h) => Honeybadger.withRequest(request, () => {
        const localReqId = ++reqId;
        Honeybadger.setContext({
            [localReqId]: true
        })

        console.log(Honeybadger.__store.getStore().context);

        return setTimeout(100).then(() => {
            if (localReqId === 2) throw new Error('Badgers!');
            else console.log(`Done: ${localReqId}`)
            return "OK";
        });
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
var restify = require('restify');
const Honeybadger = require("../../dist/server/honeybadger.js")
Honeybadger.configure({});

var server = restify.createServer();

server.use(Honeybadger.requestHandler)

let reqId = 0;
server.get('/test-context', (req, res, next) => {
    const localReqId = ++reqId;
    Honeybadger.setContext({
        [localReqId]: true
    })

    console.log(Honeybadger.__store.getStore().context);

    if (localReqId === 2) setTimeout(() => {
        throw new Error('Badgers!')
    }, 100)
    else setTimeout(() => {
        console.log(`Done: ${localReqId}`);
        res.send("OK");
        next(false);
    }, 100);
})

server.on('restifyError', Honeybadger.errorHandler);

server.listen(3000, function () {
    console.log('%s listening at http://localhost:3000', server.name);
});
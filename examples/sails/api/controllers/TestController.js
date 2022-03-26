
const Honeybadger = require("../../../../dist/server/honeybadger.js")

let reqId = 0;

module.exports = {
    context: (req, res, next) => {
        const localReqId = ++reqId;
        Honeybadger.setContext({
            [localReqId]: true
        })

        console.log(Honeybadger.__store?.getStore?.()?.context);

        if (localReqId === 2) setTimeout(() => {
            throw new Error('Badgers!')
        }, 100)
        else setTimeout(() => {
            console.log(`Done: ${localReqId}`)
            res.send("OK");
        }, 100);
    }
};
const Honeybadger = require("../../../../dist/server/honeybadger.js")

module.exports = {
    unhandled: (req, res, next) => {
        Honeybadger.setContext({
            user_id: '8yf84'
        });
        throw new Error('Unhandled error. Should be reported on Honeybadger dashboard');
    },

    report: (req, res, next) => {
        Honeybadger.notify('Hello World!');
        res.send('Message should have been reported to Honeybadger! Please check your Honeybadger dashboard.');
    },
};
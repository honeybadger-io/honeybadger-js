'use strict';

const { honeybadgerWrapper } = require('./honeybadger')
const Honeybadger = require('@honeybadger-io/js')

const formatJSONResponse = (response) => {
  return {
    statusCode: 200,
    body: JSON.stringify(response)
  }
}

module.exports = {
  hello: async (event) => {
    const hbKey = !!process.env.HONEYBADGER_API_KEY;
    return formatJSONResponse({
      message: `Hello, welcome to the exciting Serverless world! HB Key available: ${hbKey ? 'yes' : 'no'}`,
      event,
    });
  },
  helloWrapped: honeybadgerWrapper((event) => {
    const hbKey = !!process.env.HONEYBADGER_API_KEY;
    return formatJSONResponse({
      message: `Hello, welcome to the exciting Serverless world! HB Key available: ${hbKey ? 'yes' : 'no'}. This handler is honeybadgerWrapped!`,
      event,
    });
  }),
  syncError: honeybadgerWrapper(async (event) => {
    const willReport = event.body && event.body.report === 'yes';
    if (willReport) {
      throw new Error('sync-error');
    }

    return formatJSONResponse({
      message: "You summoned the sync-error handler! Nothing was sent to Honeybadger. POST with { 'body': { 'report': 'yes' } } to report to Honeybadger.",
      event,
    });
  }),
  asyncError: honeybadgerWrapper(async (event) => {
    const asyncThatThrows = async (shouldThrow) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          (shouldThrow ? reject(new Error('async-error')): resolve())
        }, 300);
      });
    }

    const willReport = event.body && event.body.report === 'yes';
    await asyncThatThrows(willReport);
    return formatJSONResponse({
      message: "You summoned the async-error handler! Nothing was sent to Honeybadger. POST with { 'body': { 'report': 'yes' } } to report to Honeybadger.",
      event,
    });
  }),
  callbackError: honeybadgerWrapper((event, context, callback) => {
    const willReport = event.body && event.body.report === 'yes';
    if (willReport) {
      callback(new Error('callback-error'));
      return;
    }

    const resp = formatJSONResponse({
      message: "You summoned the callback-error handler! Nothing was sent to Honeybadger. POST with { 'body': { 'report': 'yes' } } to report to Honeybadger.",
      event,
    });
    callback(null, resp);
  }),
  setTimeoutError: honeybadgerWrapper((event, context, callback) => {
    const willReport = event.body && event.body.report === 'yes';
    setTimeout(() => {
      if (willReport) {
        throw new Error('set-timeout-error');
      }

      const resp = formatJSONResponse({
        message: "You summoned the setTimeout-error handler! Nothing was sent to Honeybadger. POST with { 'body': { 'report': 'yes' } } to report to Honeybadger.",
        event,
      });
      callback(null, resp);
    }, 300);
  }),
  timeoutWarning: honeybadgerWrapper(async (event) => {
    const asyncThatResolvesAfterTimeout = async (shouldTimeout) => {
      return new Promise((resolve, _reject) => {
        setTimeout(() => {
          resolve()
        }, shouldTimeout ? (1000 * 60 * 20) : 200) // 20 minutes
      });
    }

    const shouldTimeout = event.body && event.body.timeout === 'yes';
    await asyncThatResolvesAfterTimeout(shouldTimeout);
    return formatJSONResponse({
      message: "You summoned the timeoutWarning handler! Nothing was sent to Honeybadger. POST with { 'body': { 'timeout': 'yes' } } to run the function until it times out.",
      event,
    });
  }),
  tryCatchNotifyContinue: honeybadgerWrapper(async (event) => {
    const tryCatchNotifyContinue = async () => {
      throw new Error('try-catch-notify-continue');
    }

    try {
      await tryCatchNotifyContinue();
    } catch (err) {
      // Honeybadger.notify(err); // this will not work
      await Honeybadger.notifyAsync(err);
    }

    return formatJSONResponse({
      message: 'You summoned the tryCatchNotifyContinue handler! An error report should have been sent to Honeybadger, but the process is still running.',
      event,
    });

  }),
}

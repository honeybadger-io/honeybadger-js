import type { Handler, Context } from 'aws-lambda';
import honeybadgerWrapper from './honeybadger';
import dotenv from 'dotenv';
import path from 'path';
const dotenvPath = path.join(__dirname, '../', `config/.env.${process.env.NODE_ENV}`);
dotenv.config({
  path: dotenvPath,
});

const formatJSONResponse = (response) => {
  return {
    statusCode: 200,
    body: JSON.stringify(response)
  }
}

export const hello: Handler = honeybadgerWrapper(async (event, _context: Context) => {
  const hbKey = !!process.env.HONEYBADGER_API_KEY;
  return formatJSONResponse({
    message: `Hello, welcome to the exciting Serverless world! HB Key available: ${hbKey ? 'yes' : 'no'}`,
    event,
  });
});

export const syncError: Handler = honeybadgerWrapper(async (event) => {
  const willReport = event.body && event.body.report === 'yes';
  if (willReport) {
    throw new Error('sync-error');
  }

  return formatJSONResponse({
    message: "You summoned the sync-error handler! Nothing was sent to Honeybadger. POST with { 'body': { 'report': 'yes' } } to report to Honeybadger.",
    event,
  });
});

export const asyncError = honeybadgerWrapper(async (event) => {
  const asyncThatThrows = async (shouldThrow) => {
    return new Promise<void>((resolve, reject) => {
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
});

export const callbackError=  honeybadgerWrapper((event, _context, callback) => {
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
});

export const setTimeoutError = honeybadgerWrapper((event, _context, callback) => {
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
});

export const timeoutWarning = honeybadgerWrapper(async (event) => {
  const asyncThatResolvesAfterTimeout = async (shouldTimeout) => {
    return new Promise<void>((resolve, _reject) => {
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
});

/* eslint-disable @typescript-eslint/no-explicit-any */
import Honeybadger from '../core/client'
// eslint-disable-next-line import/no-unresolved
import { Handler, Callback, Context } from 'aws-lambda'
import { AsyncStore } from "./async_store";

export type SyncHandler<TEvent = any, TResult = any> = (
    event: TEvent,
    context: Context,
    callback: Callback<TResult>,
) => void;

export type AsyncHandler<TEvent = any, TResult = any> = (
    event: TEvent,
    context: Context,
) => Promise<TResult>;

function isHandlerSync(handler: Handler): handler is SyncHandler {
    return handler.length > 2
}

function reportToHoneybadger(hb: Honeybadger, err: Error | string | null, callback: (err: Error | string | null) => void) {
    hb.notify(err, {
        afterNotify: function () {
            hb.clear()
            callback(err)
        }
    })
}

function asyncHandler<TEvent = any, TResult = any>(handler: AsyncHandler<TEvent, TResult>, hb: Honeybadger): AsyncHandler<TEvent, TResult> {
    return function wrappedLambdaHandler(event, context) {
        hb.configure({store: AsyncStore})
        return new Promise<TResult>((resolve, reject) => {
            AsyncStore.run({context: {}, breadcrumbs: []}, () => {
                try {
                    handler(event, context)
                        .then(resolve)
                        .catch(err => reportToHoneybadger(hb, err, reject))
                } catch (err) {
                    reportToHoneybadger(hb, err, reject)
                }
            })
        })
    }
}

function syncHandler<TEvent = any, TResult = any>(handler: SyncHandler<TEvent, TResult>, hb: Honeybadger): SyncHandler<TEvent, TResult> {
    return function wrappedLambdaHandler(event, context, cb) {
        hb.configure({store: AsyncStore})
        AsyncStore.run({context: {}, breadcrumbs: []}, () => {
            try {
                handler(event, context, (error, result) => {
                    if (error) {
                        return reportToHoneybadger(hb, error, cb)
                    }

                    cb(null, result)
                });
            } catch (err) {
                reportToHoneybadger(hb, err, cb)
            }
        })
    }
}

export function lambdaHandler<TEvent = any, TResult = any>(handler: Handler<TEvent, TResult>): Handler<TEvent, TResult> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const hb: Honeybadger = this
    if (isHandlerSync(handler)) {
        return syncHandler(handler, hb)
    }

    return asyncHandler(handler, hb)
}

let listenerRemoved = false

/**
 * Removes AWS Lambda default listener that
 * exits the process before letting us report to honeybadger.
 */
export function removeAwsDefaultUncaughtExceptionListener() {
    if (listenerRemoved) {
        return
    }

    listenerRemoved = true
    const listeners = process.listeners('uncaughtException')
    if (listeners.length === 0) {
        return
    }

    // We assume it's the first listener
    process.removeListener('uncaughtException', listeners[0])
}
/* eslint-disable @typescript-eslint/no-explicit-any */
import Honeybadger from '../core/client'
// eslint-disable-next-line import/no-unresolved
import { Handler, Callback, Context } from 'aws-lambda'

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

function asyncHandler<TEvent = any, TResult = any>(handler: AsyncHandler<TEvent, TResult>, hb: Honeybadger): AsyncHandler<TEvent, TResult> {
    return async function wrappedLambdaHandler(event, context) {
        try {
            return await handler(event, context)
        }
        catch (err) {
            return new Promise((_, reject) => {
                hb.notify(err, {
                    afterNotify: function () {
                        hb.clear()
                        reject(err)
                    }
                })
            })
        }
    }
}

function syncHandler<TEvent = any, TResult = any>(handler: SyncHandler<TEvent, TResult>, hb: Honeybadger): SyncHandler<TEvent, TResult> {
    return function wrappedLambdaHandler(event, context, cb) {
        const hbHandler = (err: Error | string | null) => {
            hb.notify(err, {
                afterNotify: function () {
                    hb.clear()
                    cb(err)
                }
            })
        }

        try {
            handler(event, context, (error, result) => {
                if (error) {
                    return hbHandler(error)
                }

                cb(null, result)
            });
        } catch (err) {
            hbHandler(err)
        }
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
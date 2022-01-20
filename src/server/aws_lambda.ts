import Honeybadger from '../core/client'
// eslint-disable-next-line import/no-unresolved
import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayProxyCallback, Context } from 'aws-lambda'

export type SyncHandler = (
    event: APIGatewayProxyEvent,
    context: Context,
    callback: APIGatewayProxyCallback,
) => void;

export type AsyncHandler = (
    event: APIGatewayProxyEvent,
    context: Context,
) => Promise<APIGatewayProxyResult>;

function isHandlerSync(handler: APIGatewayProxyHandler): boolean {
    return handler.length > 2
}

function asyncHandler(handler: APIGatewayProxyHandler, hb: Honeybadger): AsyncHandler {
    return async (event, context) => {
        try {
            return await (handler as AsyncHandler)(event, context)
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

function syncHandler(handler: APIGatewayProxyHandler, hb: Honeybadger): SyncHandler {
    return (event, context, cb) => {
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

export function lambdaHandler(handler: APIGatewayProxyHandler): any {
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
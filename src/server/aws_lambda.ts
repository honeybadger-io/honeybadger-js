import Honeybadger from '../core/client'
// eslint-disable-next-line import/no-unresolved
import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayProxyCallback, Context } from 'aws-lambda'

type SyncHandler = (
    event: APIGatewayProxyEvent,
    context: Context,
    callback: APIGatewayProxyCallback,
) => void;

export type AsyncHandler = (
    event: APIGatewayProxyEvent,
    context: Context,
) => Promise<APIGatewayProxyResult>;

/**
 * async (event) => async handler
 * async (event, context) => async handler
 * (event, context, callback) => sync handler
 * @param handler
 */
function getAsyncHandler(handler: APIGatewayProxyHandler): AsyncHandler {
    if (handler.length > 2) {
        return ((event, context) => {
                return new Promise((resolve, reject) => {
                    (handler as SyncHandler)(event, context, (error, result) => {
                        if (error === null || error === undefined) {
                            resolve(result)
                        } else {
                            reject(error)
                        }
                    })
                })
        }) as AsyncHandler
    }

    return (handler as AsyncHandler)
}

export function lambdaHandler(handler: APIGatewayProxyHandler): AsyncHandler {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const hb: Honeybadger = this
    const asyncHandler = getAsyncHandler(handler)
    return async (event, context) => {
        try {
            return await asyncHandler(event, context)
        }
        catch (err) {
            return new Promise((_, reject) => {
                hb.logger.error('caught error. will report.')
                hb.notify(err, {
                    afterNotify: function () {
                        hb.logger.error('hb:lambdaHandler afterNotify')
                        hb.clear()
                        reject(err)
                    }
                })
            })
        }
    }
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
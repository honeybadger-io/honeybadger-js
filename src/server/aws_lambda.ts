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
    const hb = this
    const asyncHandler = getAsyncHandler(handler)
    return async (event, context) => {
        try {
            return await asyncHandler(event, context)
        }
        catch (err) {
            console.log('hb:lambdaHandler notify')
            hb.notify(err, {
                afterNotify: function () {
                    console.log('hb:lambdaHandler afterNotify')
                    hb.clear()
                    throw err;
                }
            })
        }
    }
}
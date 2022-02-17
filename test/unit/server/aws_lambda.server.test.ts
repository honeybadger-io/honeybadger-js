import Singleton from "../../../src/server";
// @ts-ignore
import { nullLogger } from "../helpers";
import nock from "nock";
import * as sinon from 'sinon'
import { Notice } from "../../../src/core/types";
// eslint-disable-next-line import/no-unresolved
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { AsyncHandler, SyncHandler } from '../../../src/server/aws_lambda'

const mockAwsEvent = (obj: Partial<APIGatewayProxyEvent> = {}) => {
    return Object.assign({}, obj) as APIGatewayProxyEvent;
}

const mockAwsContext = (obj: Partial<Context> = {}) => {
    return Object.assign({}, obj) as Context;
}

const mockAwsResult = (obj: Partial<APIGatewayProxyResult> = {}) => {
    return Object.assign({}, obj) as APIGatewayProxyResult;
}

describe('Lambda Handler', function () {
    let client: typeof Singleton;

    beforeEach(function () {
        client = Singleton.factory({
            logger: nullLogger(),
            environment: null
        })
    })

    describe('with arguments', function () {
        const awsEvent = mockAwsEvent({body: '1'})
        const awsContext = mockAwsContext({awsRequestId: '2'})
        let handlerFunc;

        beforeEach(function () {
            handlerFunc = sinon.spy(() => Promise.resolve())
            const handler = client.lambdaHandler(handlerFunc) as AsyncHandler
            return handler(awsEvent, awsContext)
                .then(() => {
                    return new Promise((resolve => {
                        process.nextTick(function () {
                            resolve(true)
                        })
                    }))
                })
        })

        it('calls original handler with arguments', function () {
            expect(handlerFunc.lastCall.args.length).toBe(2)
            expect(handlerFunc.lastCall.args[0]).toBe(awsEvent)
            expect(handlerFunc.lastCall.args[1]).toBe(awsContext)
        })
    })

    describe('async handlers', function () {

        it('calls handler with asynchronous response if no error is thrown', async function () {
            client.configure({
                apiKey: 'testing'
            })

            const handler = client.lambdaHandler(async function (_event, _context) {
                return Promise.resolve(mockAwsResult({body: 'works!'}))
            }) as AsyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

            const res = await handler(mockAwsEvent(), mockAwsContext())
            expect(res).toBeDefined()
            expect(res.body).toEqual('works!')
        })

        it('calls handler with synchronous response if no error is thrown', async function () {
            client.configure({
                apiKey: 'testing'
            })

            const handler = client.lambdaHandler(async function (_event, _context) {
                return mockAwsResult({body: 'works!'})
            }) as AsyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

            const res = await handler(mockAwsEvent(), mockAwsContext())
            expect(res).toBeDefined()
            expect(res.body).toEqual('works!')
        })

        it('calls handler if notify exits on preconditions', async function () {
            client.configure({
                apiKey: null
            })

            // @ts-expect-error
            const handler = client.lambdaHandler(async function (_event, _context) {
                throw new Error("Badgers!")
            }) as AsyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

            return expect(handler(mockAwsEvent(), mockAwsContext())).rejects.toEqual(new Error("Badgers!"))
        })

        it('reports errors to Honeybadger', async function () {
            client.configure({
                apiKey: 'testing'
            })

            nock.cleanAll()

            const api = nock("https://api.honeybadger.io")
                .post("/v1/notices/js")
                .reply(201, '{"id":"1a327bf6-e17a-40c1-ad79-404ea1489c7a"}')

            // @ts-expect-error
            const handler = client.lambdaHandler(async function (_event) {
                throw new Error("Badgers!")
            }) as AsyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

            try {
                await handler(mockAwsEvent(), mockAwsContext())
            } catch (e) {
                // eslint-disable-next-line jest/no-conditional-expect
                expect(e).toEqual(new Error("Badgers!"))
            }

            return new Promise<void>(resolve => {
                setTimeout(() => {
                    api.done()
                    resolve()
                }, 50)
            })
        })

        it('reports async errors to Honeybadger', async function () {
            client.configure({
                apiKey: 'testing'
            })

            nock.cleanAll()

            const api = nock("https://api.honeybadger.io")
                .post("/v1/notices/js")
                .reply(201, '{"id":"1a327bf6-e17a-40c1-ad79-404ea1489c7a"}')

            const handler = client.lambdaHandler(async function (_event) {
                return new Promise<APIGatewayProxyResult>((resolve, reject) => {
                    setTimeout(function () {
                        reject(new Error("Badgers!"))
                    }, 0)
                })
            }) as AsyncHandler

            try {
                await handler(mockAwsEvent(), mockAwsContext())
            } catch (e) {
                // eslint-disable-next-line jest/no-conditional-expect
                expect(e).toEqual(new Error("Badgers!"))
            }

            return new Promise<void>(resolve => {
                setTimeout(() => {
                    api.done()
                    resolve()
                }, 50)
            })
        })

        it('reports two errors for two failing lambdaHandlers with separate context', async () => {
            client.configure({
                apiKey: 'testing'
            })

            nock.cleanAll()

            const api = nock("https://api.honeybadger.io")
                .post("/v1/notices/js")
                .times(2)
                .reply(201, '{"id":"1a327bf6-e17a-40c1-ad79-404ea1489c7a"}')

            client.afterNotify((err, notice) => {
                expect(err).toBeUndefined()
                if (notice.message === 'Badgers 1!') {
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(notice.context.handler).toEqual(1)
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(notice.context.valueOnlyPresentInOneHandler).toEqual('badgers 1')
                }
                if (notice.message === 'Badgers 2!') {
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(notice.context.handler).toEqual(2)
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(notice.context.valueOnlyPresentInOneHandler).toBeUndefined()
                }
            })

            // @ts-expect-error
            const handler1 = client.lambdaHandler(async function (_event) {
                client.setContext({handler: 1, valueOnlyPresentInOneHandler: 'badgers 1'})
                throw new Error("Badgers 1!")
            }) as AsyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

            // @ts-expect-error
            const handler2 = client.lambdaHandler(async function (_event) {
                client.setContext({handler: 2})
                throw new Error("Badgers 2!")
            }) as AsyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

            await expect(handler1(mockAwsEvent(), mockAwsContext())).rejects.toEqual(new Error("Badgers 1!"))
            await expect(handler2(mockAwsEvent(), mockAwsContext())).rejects.toEqual(new Error("Badgers 2!"))

            return new Promise<void>(resolve => {
                setTimeout(() => {
                    api.done()
                    resolve()
                }, 50)
            })
        });

        it('reports two errors for two failing lambdaHandlers with separate breadcrumbs', async () => {
            client.configure({
                apiKey: 'testing'
            })

            nock.cleanAll()

            const api = nock("https://api.honeybadger.io")
                .post("/v1/notices/js")
                .times(2)
                .reply(201, '{"id":"1a327bf6-e17a-40c1-ad79-404ea1489c7a"}')

            client.afterNotify((err, notice) => {
                expect(err).toBeUndefined()
                if (notice.message === 'Badgers 1!') {
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(notice.__breadcrumbs).toHaveLength(2)
                }
                if (notice.message === 'Badgers 2!') {
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(notice.__breadcrumbs).toHaveLength(2)
                }
            })

            // @ts-expect-error
            const handler1 = client.lambdaHandler(async function (_event) {
                client.addBreadcrumb('handler 1')
                throw new Error("Badgers 1!")
            }) as AsyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

            // @ts-expect-error
            const handler2 = client.lambdaHandler(async function (_event) {
                client.addBreadcrumb('handler 2')
                throw new Error("Badgers 2!")
            }) as AsyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

            await expect(handler1(mockAwsEvent(), mockAwsContext())).rejects.toEqual(new Error("Badgers 1!"))
            await expect(handler2(mockAwsEvent(), mockAwsContext())).rejects.toEqual(new Error("Badgers 2!"))

            return new Promise<void>(resolve => {
                setTimeout(() => {
                    api.done()
                    resolve()
                }, 50)
            })
        })

        it('reports error for one failing lambdaHandler (two in total) with separate context', async () => {
            client.configure({
                apiKey: 'testing'
            })

            nock.cleanAll()

            const api = nock("https://api.honeybadger.io")
                .post("/v1/notices/js")
                .times(1)
                .reply(201, '{"id":"1a327bf6-e17a-40c1-ad79-404ea1489c7a"}')

            client.afterNotify((err, notice) => {
                expect(err).toBeUndefined()
                expect(notice.message).toEqual('Badgers 2!')
                // eslint-disable-next-line jest/no-conditional-expect
                expect(notice.context.handler).toEqual(2)
                // eslint-disable-next-line jest/no-conditional-expect
                expect(notice.context.valueOnlyPresentInOneHandler).toBeUndefined()
            })

            // @ts-expect-error
            const handler1 = client.lambdaHandler(async function (_event) {
                client.setContext({handler: 1, valueOnlyPresentInOneHandler: 'badgers 1'})
                return 'done!';
            }) as AsyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

            // @ts-expect-error
            const handler2 = client.lambdaHandler(async function (_event) {
                client.setContext({handler: 2})
                throw new Error("Badgers 2!")
            }) as AsyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

            await expect(handler1(mockAwsEvent(), mockAwsContext())).resolves.not.toThrow()
            await expect(handler2(mockAwsEvent(), mockAwsContext())).rejects.toEqual(new Error("Badgers 2!"))

            return new Promise<void>(resolve => {
                setTimeout(() => {
                    api.done()
                    resolve()
                }, 50)
            })
        });
    })

    describe('non-async handlers', function () {

        beforeEach(function () {
            client.configure({
                apiKey: 'testing'
            })
        })

        it('calls handler if no error is thrown', function () {
            return new Promise((done) => {
                const handler = client.lambdaHandler(function (_event, _context, callback) {
                    callback(null, mockAwsResult({body: 'works!'}))
                }) as SyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

                handler(mockAwsEvent(), mockAwsContext(), (err, res) => {
                    expect(res).toBeDefined()
                    expect(res.body).toEqual('works!')
                    done(err)
                })
            })
        })

        it('calls handler if notify exits on preconditions', function () {
            return new Promise((done) => {
                client.configure({
                    apiKey: null
                })

                const handler = client.lambdaHandler(function (_event, _context, _callback) {
                    throw new Error("Badgers!")
                }) as SyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

                handler(mockAwsEvent(), mockAwsContext(), (err, _res) => {
                    expect(err).toEqual(new Error("Badgers!"))
                    done(null)
                })
            })
        })

        it('reports errors to Honeybadger', function () {
            nock.cleanAll()

            const api = nock("https://api.honeybadger.io")
                .post("/v1/notices/js")
                .reply(201, '{"id":"1a327bf6-e17a-40c1-ad79-404ea1489c7a"}')

            const handler = client.lambdaHandler(function (_event, _context, _callback) {
                throw new Error("Badgers!")
            }) as SyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

            return new Promise(done => {
                handler(mockAwsEvent(), mockAwsContext(), (err, _res) => {
                    expect(err).toEqual(new Error("Badgers!"))
                    setTimeout(() => {
                        api.done()
                        done(null)
                    }, 50)
                })
            })
        })

        it('reports async errors to Honeybadger', function () {
            nock.cleanAll()

            const api = nock("https://api.honeybadger.io")
                .post("/v1/notices/js")
                .reply(201, '{"id":"1a327bf6-e17a-40c1-ad79-404ea1489c7a"}')

            const handler = client.lambdaHandler(function (_event, _context, callback) {
                setTimeout(function () {
                    callback(new Error("Badgers!"))
                }, 0)
            }) as SyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

            return new Promise(done => {
                handler(mockAwsEvent(), mockAwsContext(), (err, _res) => {
                    expect(err).toEqual(new Error("Badgers!"))
                    setTimeout(() => {
                        api.done()
                        done(null)
                    }, 50)
                })
            })
        })

        it('calls beforeNotify and afterNotify handlers', function () {
            nock.cleanAll()

            const api = nock("https://api.honeybadger.io")
                .post("/v1/notices/js")
                .reply(201, '{"id":"1a327bf6-e17a-40c1-ad79-404ea1489c7a"}')

            const handler = client.lambdaHandler(function (_event, _context, callback) {
                setTimeout(function () {
                    callback(new Error("Badgers!"))
                }, 0)
            }) as SyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

            client.beforeNotify(function (notice: Notice) {
                notice.context = Object.assign(notice.context, {foo: 'bar'})
            })

            let afterNotifyCalled = false;
            client.afterNotify(function (err: Error | undefined, notice: Notice) {
                expect(notice.context).toEqual({foo: 'bar'})
                afterNotifyCalled = true;
            })

            return new Promise(done => {
                handler(mockAwsEvent(), mockAwsContext(), (err, _res) => {
                    expect(err).toEqual(new Error("Badgers!"))
                    setTimeout(() => {
                        api.done()
                        expect(afterNotifyCalled).toBeTruthy()
                        done(null)
                    }, 50)
                })
            })
        })

        it('reports two errors for two failing lambdaHandlers with separate context', function () {
            client.configure({
                apiKey: 'testing'
            })

            nock.cleanAll()

            const api = nock("https://api.honeybadger.io")
                .post("/v1/notices/js")
                .times(2)
                .reply(201, '{"id":"1a327bf6-e17a-40c1-ad79-404ea1489c7a"}')

            client.afterNotify((err, notice) => {
                expect(err).toBeUndefined()
                if (notice.message === 'Badgers 1!') {
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(notice.context.handler).toEqual(1)
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(notice.context.valueOnlyPresentInOneHandler).toEqual('badgers 1')
                }
                if (notice.message === 'Badgers 2!') {
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(notice.context.handler).toEqual(2)
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(notice.context.valueOnlyPresentInOneHandler).toBeUndefined()
                }
            })

            const handler1 = client.lambdaHandler(function (_event, _context, callback) {
                client.setContext({handler: 1, valueOnlyPresentInOneHandler: 'badgers 1'})
                setTimeout(function () {
                    callback(new Error("Badgers 1!"))
                }, 0)
            }) as SyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

            const handler2 = client.lambdaHandler(function (_event, _context, callback) {
                client.setContext({handler: 2})
                setTimeout(function () {
                    callback(new Error("Badgers 2!"))
                }, 0)
            }) as SyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

            return new Promise<void>((resolve) => {
                let reports = 0
                const done = () => {
                    reports++
                    if (reports !== 2) {
                        return
                    }
                    setTimeout(() => {
                        api.done()
                        resolve()
                    }, 50)
                }

                handler1(mockAwsEvent(), mockAwsContext(), (error, _result) => {
                    expect(error).toBeDefined()
                    expect((error as Error).message).toEqual('Badgers 1!')
                    done()
                })
                handler2(mockAwsEvent(), mockAwsContext(), (error, _result) => {
                    expect(error).toBeDefined()
                    expect((error as Error).message).toEqual('Badgers 2!')
                    done()
                })
            })
        });

        it('reports two errors for two failing lambdaHandlers with separate breadcrumbs', function () {
            client.configure({
                apiKey: 'testing'
            })

            nock.cleanAll()

            const api = nock("https://api.honeybadger.io")
                .post("/v1/notices/js")
                .times(2)
                .reply(201, '{"id":"1a327bf6-e17a-40c1-ad79-404ea1489c7a"}')

            client.afterNotify((err, notice) => {
                expect(err).toBeUndefined()
                if (notice.message === 'Badgers 1!') {
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(notice.__breadcrumbs).toHaveLength(2)
                }
                if (notice.message === 'Badgers 2!') {
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(notice.__breadcrumbs).toHaveLength(2)
                }
            })

            const handler1 = client.lambdaHandler(function (_event, _context, callback) {
                client.addBreadcrumb('handler 1')
                setTimeout(function () {
                    callback(new Error("Badgers 1!"))
                }, 0)
            }) as SyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

            const handler2 = client.lambdaHandler(function (_event, _context, callback) {
                client.addBreadcrumb('handler 2')
                setTimeout(function () {
                    callback(new Error("Badgers 2!"))
                }, 0)
            }) as SyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

            return new Promise<void>((resolve) => {
                let reports = 0
                const done = () => {
                    reports++
                    if (reports !== 2) {
                        return
                    }
                    setTimeout(() => {
                        api.done()
                        resolve()
                    }, 50)
                }

                handler1(mockAwsEvent(), mockAwsContext(), (error, _result) => {
                    expect(error).toBeDefined()
                    expect((error as Error).message).toEqual('Badgers 1!')
                    done()
                })
                handler2(mockAwsEvent(), mockAwsContext(), (error, _result) => {
                    expect(error).toBeDefined()
                    expect((error as Error).message).toEqual('Badgers 2!')
                    done()
                })
            })
        })

        it('reports error for one failing lambdaHandler (two in total) with separate context', function () {
            client.configure({
                apiKey: 'testing'
            })

            nock.cleanAll()

            const api = nock("https://api.honeybadger.io")
                .post("/v1/notices/js")
                .times(1)
                .reply(201, '{"id":"1a327bf6-e17a-40c1-ad79-404ea1489c7a"}')

            client.afterNotify((err, notice) => {
                expect(err).toBeUndefined()
                expect(notice.message).toEqual('Badgers 2!')
                expect(notice.context.handler).toEqual(2)
                expect(notice.context.valueOnlyPresentInOneHandler).toBeUndefined()
            })

            const handler1 = client.lambdaHandler(function (_event, _context, callback) {
                client.setContext({handler: 1, valueOnlyPresentInOneHandler: 'badgers 1'})
                setTimeout(function () {
                    callback(null, 'done!')
                }, 0)
            }) as SyncHandler<APIGatewayProxyEvent, string>

            const handler2 = client.lambdaHandler(function (_event, _context, callback) {
                client.setContext({handler: 2})
                setTimeout(function () {
                    callback(new Error("Badgers 2!"))
                }, 0)
            }) as SyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

            return new Promise<void>((resolve) => {
                let reports = 0
                const done = () => {
                    reports++
                    if (reports !== 2) {
                        return
                    }
                    setTimeout(() => {
                        api.done()
                        resolve()
                    }, 50)
                }

                handler1(mockAwsEvent(), mockAwsContext(), (error, _result) => {
                    expect(error).toBeNull()
                    done()
                })
                handler2(mockAwsEvent(), mockAwsContext(), (error, _result) => {
                    expect(error).toBeDefined()
                    expect((error as Error).message).toEqual('Badgers 2!')
                    done()
                })
            })
        });
    })
})
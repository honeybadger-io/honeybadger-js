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

const initNock = (expectedTimes = 1): nock.Scope => {
    nock.cleanAll()

    return nock("https://api.honeybadger.io")
        .post("/v1/notices/js")
        .times(expectedTimes)
        .reply(201, '{"id":"1a327bf6-e17a-40c1-ad79-404ea1489c7a"}')
}

const getNodeJsVersion = () => {
    const version = process.version.split('.')[0]
    return +version
}

const describeIf = getNodeJsVersion() < 12 ? describe.skip : describe;

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
            const api = initNock()
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
            const api = initNock()
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

        describeIf('AsyncStore', function () {
            /**
             * In this section, we are trying to simulate
             * the scenario where lambdaHandlers are being executed simultaneously
             * and share the same nodejs process.
             * They should not share context or breadcrumbs (the AsyncStore).
             * For each test, we have to test that the lambda handlers fail,
             * but we should not `await` because we want to run them at the same time.
             * Then we have to verify that the notice sent to Honeybadger has the expected
             * context/breadcrumbs.
             */

            it('reports two errors for two failing lambdaHandlers with separate context', () => {
                client.configure({
                    apiKey: 'testing'
                })
                const api = initNock(2)

                let resolveTestFunc: () => void;
                const testResults = {
                    handler1Resolved: false,
                    handler1NoticePasses: false,
                    handler2Resolved: false,
                    handler2NoticePasses: false,
                }
                const done = (key: string) => {
                    expect(testResults[key]).toEqual(false)
                    testResults[key] = true
                    for (const i in testResults) {
                        if (!testResults[i]) {
                            return
                        }
                    }
                    api.done()
                    resolveTestFunc()
                }

                client.afterNotify((err, notice) => {
                    expect(err).toBeUndefined()
                    if (notice.message === 'Badgers 1!') {
                        // eslint-disable-next-line jest/no-conditional-expect
                        expect(notice.context.handler).toEqual(1)
                        // eslint-disable-next-line jest/no-conditional-expect
                        expect(notice.context.valueOnlyPresentInOneHandler).toEqual('badgers 1')
                        done('handler1NoticePasses')
                    }
                    if (notice.message === 'Badgers 2!') {
                        // eslint-disable-next-line jest/no-conditional-expect
                        expect(notice.context.handler).toEqual(2)
                        // eslint-disable-next-line jest/no-conditional-expect
                        expect(notice.context.valueOnlyPresentInOneHandler).toBeUndefined()
                        done('handler2NoticePasses')
                    }
                })

                // @ts-expect-error
                const handler1 = client.lambdaHandler(async function (_event) {
                    client.setContext({handler: 1, valueOnlyPresentInOneHandler: 'badgers 1'})
                    return new Promise<string>((_resolve, reject) => {
                        setTimeout(() => {
                            reject(new Error("Badgers 1!"))
                        }, 50)
                    })
                }) as AsyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

                // @ts-expect-error
                const handler2 = client.lambdaHandler(async function (_event) {
                    client.setContext({handler: 2})
                    return new Promise<string>((_resolve, reject) => {
                        setTimeout(() => {
                            reject(new Error("Badgers 2!"))
                        }, 50)
                    })
                }) as AsyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

                return new Promise<void>(resolve => {
                    resolveTestFunc = resolve
                    handler1(mockAwsEvent(), mockAwsContext())
                        .catch(err => {
                            // eslint-disable-next-line jest/no-conditional-expect
                            expect(err).toEqual(new Error("Badgers 1!"))
                            done('handler1Resolved')
                        })
                    handler2(mockAwsEvent(), mockAwsContext())
                        .catch(err => {
                            // eslint-disable-next-line jest/no-conditional-expect
                            expect(err).toEqual(new Error("Badgers 2!"))
                            done('handler2Resolved')
                        })
                })
            });

            it('reports two errors for two failing lambdaHandlers with separate breadcrumbs', () => {
                client.configure({
                    apiKey: 'testing'
                })
                const api = initNock(2)

                let resolveTestFunc: () => void;
                const testResults = {
                    handler1Resolved: false,
                    handler1NoticePasses: false,
                    handler2Resolved: false,
                    handler2NoticePasses: false,
                }
                const done = (key: string) => {
                    expect(testResults[key]).toEqual(false)
                    testResults[key] = true
                    for (const i in testResults) {
                        if (!testResults[i]) {
                            return
                        }
                    }
                    api.done()
                    resolveTestFunc()
                }

                client.afterNotify((err, notice) => {
                    expect(err).toBeUndefined()
                    if (notice.message === 'Badgers 1!') {
                        // eslint-disable-next-line jest/no-conditional-expect
                        expect(notice.__breadcrumbs).toHaveLength(2)
                        done('handler1NoticePasses')
                    }
                    if (notice.message === 'Badgers 2!') {
                        // eslint-disable-next-line jest/no-conditional-expect
                        expect(notice.__breadcrumbs).toHaveLength(2)
                        done('handler2NoticePasses')
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

                return new Promise<void>(resolve => {
                    resolveTestFunc = resolve
                    handler1(mockAwsEvent(), mockAwsContext())
                        .catch(err => {
                            // eslint-disable-next-line jest/no-conditional-expect
                            expect(err).toEqual(new Error("Badgers 1!"))
                            done('handler1Resolved')
                        })
                    handler2(mockAwsEvent(), mockAwsContext())
                        .catch(err => {
                            // eslint-disable-next-line jest/no-conditional-expect
                            expect(err).toEqual(new Error("Badgers 2!"))
                            done('handler2Resolved')
                        })
                })
            })

            it('reports error for one failing lambdaHandler (two in total) with separate context', () => {
                client.configure({
                    apiKey: 'testing'
                })
                const api = initNock()

                let resolveTestFunc: () => void;
                const testResults = {
                    handler1Resolved: false,
                    handler2Resolved: false,
                    handler2NoticePasses: false,
                }
                const done = (key: string) => {
                    expect(testResults[key]).toEqual(false)
                    testResults[key] = true
                    for (const i in testResults) {
                        if (!testResults[i]) {
                            return
                        }
                    }
                    api.done()
                    resolveTestFunc()
                }

                client.afterNotify((err, notice) => {
                    expect(err).toBeUndefined()
                    expect(notice.message).toEqual('Badgers 2!')
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(notice.context.handler).toEqual(2)
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(notice.context.valueOnlyPresentInOneHandler).toBeUndefined()
                    done('handler2NoticePasses')
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

                return new Promise<void>(resolve => {
                    resolveTestFunc = resolve
                    handler1(mockAwsEvent(), mockAwsContext())
                        .then(() => {
                            done('handler1Resolved')
                        })
                    handler2(mockAwsEvent(), mockAwsContext())
                        .catch(err => {
                            // eslint-disable-next-line jest/no-conditional-expect
                            expect(err).toEqual(new Error("Badgers 2!"))
                            done('handler2Resolved')
                        })
                })
            });
        })
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
            const api = initNock()

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
            const api = initNock()

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
            const api = initNock()

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

        describeIf('AsyncStore', function () {
            it('reports two errors for two failing lambdaHandlers with separate context', function () {
                client.configure({
                    apiKey: 'testing'
                })
                const api = initNock(2)

                let resolveTestFunc: () => void;
                const testResults = {
                    handler1Resolved: false,
                    handler1NoticePasses: false,
                    handler2Resolved: false,
                    handler2NoticePasses: false,
                }
                const done = (key: string) => {
                    expect(testResults[key]).toEqual(false)
                    testResults[key] = true
                    for (const i in testResults) {
                        if (!testResults[i]) {
                            return
                        }
                    }

                    api.done()
                    resolveTestFunc()
                }

                client.afterNotify(function assertionHandler(err, notice) {
                    expect(err).toBeUndefined()
                    if (notice.message === 'Badgers 1!') {
                        // eslint-disable-next-line jest/no-conditional-expect
                        expect(notice.context.handler).toEqual(1)
                        // eslint-disable-next-line jest/no-conditional-expect
                        expect(notice.context.valueOnlyPresentInOneHandler).toEqual('badgers 1')
                        done('handler1NoticePasses')
                    }
                    if (notice.message === 'Badgers 2!') {
                        // eslint-disable-next-line jest/no-conditional-expect
                        expect(notice.context.handler).toEqual(2)
                        // eslint-disable-next-line jest/no-conditional-expect
                        expect(notice.context.valueOnlyPresentInOneHandler).toBeUndefined()
                        done('handler2NoticePasses')
                    }
                })

                const handler1 = client.lambdaHandler(function (_event, _context, callback) {
                    client.setContext({handler: 1, valueOnlyPresentInOneHandler: 'badgers 1'})
                    setTimeout(function () {
                        callback(new Error("Badgers 1!"))
                    }, 100)
                }) as SyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

                const handler2 = client.lambdaHandler(function (_event, _context, callback) {
                    client.setContext({handler: 2})
                    setTimeout(function () {
                        callback(new Error("Badgers 2!"))
                    }, 50)
                }) as SyncHandler<APIGatewayProxyEvent, APIGatewayProxyResult>

                return new Promise<void>((resolve) => {
                    resolveTestFunc = resolve
                    handler1(mockAwsEvent(), mockAwsContext(), (error, _result) => {
                        expect(error).toBeDefined()
                        expect((error as Error).message).toEqual('Badgers 1!')
                        done('handler1Resolved')
                    })
                    handler2(mockAwsEvent(), mockAwsContext(), (error, _result) => {
                        expect(error).toBeDefined()
                        expect((error as Error).message).toEqual('Badgers 2!')
                        done('handler2Resolved')
                    })
                })
            });

            it('reports two errors for two failing lambdaHandlers with separate breadcrumbs', function () {
                client.configure({
                    apiKey: 'testing'
                })
                const api = initNock(2)

                let resolveTestFunc: () => void;
                const testResults = {
                    handler1Resolved: false,
                    handler1NoticePasses: false,
                    handler2Resolved: false,
                    handler2NoticePasses: false,
                }
                const done = (key: string) => {
                    expect(testResults[key]).toEqual(false)
                    testResults[key] = true
                    for (const i in testResults) {
                        if (!testResults[i]) {
                            return
                        }
                    }

                    api.done()
                    resolveTestFunc()
                }

                client.afterNotify((err, notice) => {
                    expect(err).toBeUndefined()
                    if (notice.message === 'Badgers 1!') {
                        // eslint-disable-next-line jest/no-conditional-expect
                        expect(notice.__breadcrumbs).toHaveLength(2)
                        done('handler1NoticePasses')
                    }
                    if (notice.message === 'Badgers 2!') {
                        // eslint-disable-next-line jest/no-conditional-expect
                        expect(notice.__breadcrumbs).toHaveLength(2)
                        done('handler2NoticePasses')
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
                    resolveTestFunc = resolve
                    handler1(mockAwsEvent(), mockAwsContext(), (error, _result) => {
                        expect(error).toBeDefined()
                        expect((error as Error).message).toEqual('Badgers 1!')
                        done('handler1Resolved')
                    })
                    handler2(mockAwsEvent(), mockAwsContext(), (error, _result) => {
                        expect(error).toBeDefined()
                        expect((error as Error).message).toEqual('Badgers 2!')
                        done('handler2Resolved')
                    })
                })
            })

            it('reports error for one failing lambdaHandler (two in total) with separate context', function () {
                client.configure({
                    apiKey: 'testing'
                })
                const api = initNock()

                let resolveTestFunc: () => void;
                const testResults = {
                    handler1Resolved: false,
                    handler2Resolved: false,
                    handler2NoticePasses: false,
                }
                const done = (key: string) => {
                    expect(testResults[key]).toEqual(false)
                    testResults[key] = true
                    for (const i in testResults) {
                        if (!testResults[i]) {
                            return
                        }
                    }

                    api.done()
                    resolveTestFunc()
                }

                client.afterNotify((err, notice) => {
                    expect(err).toBeUndefined()
                    expect(notice.message).toEqual('Badgers 2!')
                    expect(notice.context.handler).toEqual(2)
                    expect(notice.context.valueOnlyPresentInOneHandler).toBeUndefined()
                    done('handler2NoticePasses')
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
                    resolveTestFunc = resolve
                    handler1(mockAwsEvent(), mockAwsContext(), (error, _result) => {
                        expect(error).toBeNull()
                        done('handler1Resolved')
                    })
                    handler2(mockAwsEvent(), mockAwsContext(), (error, _result) => {
                        expect(error).toBeDefined()
                        expect((error as Error).message).toEqual('Badgers 2!')
                        done('handler2Resolved')
                    })
                })
            });
        })
    })
})
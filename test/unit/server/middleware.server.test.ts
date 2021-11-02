import express from "express";
import nock from "nock";
import {mock, spy} from 'sinon'
import request from 'supertest'
import { promisify } from 'util'
import Singleton from "../../../src/server";
// @ts-ignore
import {nullLogger} from "../helpers";

describe('Express Middleware', function () {
    let client
    let client_mock
    const error = new Error('Badgers!')

    beforeEach(function () {
        client = Singleton.factory({
            logger: nullLogger(),
            environment: null
        })
        client_mock = mock(client)
    })

    // eslint-disable-next-line jest/expect-expect
    it('is sane', function () {
        const app = express()

        app.get('/user', function (req, res) {
            res.status(200).json({ name: 'john' })
        })

        client_mock.expects('notify').never()

        return request(app)
            .get('/user')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200)
    })

    it('reports the error to Honeybadger and calls next error handler', function() {
        const app = express()
        const expected = spy()

        app.use(client.requestHandler)

        app.get('/', function(_req, _res) {
            throw(error)
        })

        app.use(client.errorHandler)

        app.use(function(err, _req, _res, next) {
            expected()
            next(err)
        })

        client_mock.expects('notify').once().withArgs(error)

        return request(app)
            .get('/')
            .expect(500)
            .then(() => {
                client_mock.verify()
                expect(expected.calledOnce).toBeTruthy()
            })
    })

    it('reports async errors to Honeybadger and calls next error handler', function() {
        const app = express()
        const expected = spy()

        app.use(client.requestHandler)

        app.get('/', function(_req, _res) {
            setTimeout(function asyncThrow() {
                throw(error)
            }, 0)
        })

        app.use(client.errorHandler)

        app.use(function(err, _req, _res, next) {
            expected()
            next(err)
        })

        client_mock.expects('notify').once().withArgs(error)

        return request(app)
            .get('/')
            .expect(500)
            .then(() => {
                client_mock.verify()
                expect(expected.calledOnce).toBeTruthy()
            })
    })

    it('resets context between requests', function() {
        const app = express()

        app.use(client.requestHandler)

        app.get('/', function(_req, res) {
            res.send('Hello World!')
        })

        app.use(client.errorHandler)

        client_mock.expects('clear').once()

        return request(app)
            .get('/')
            .expect(200)
            .then(() => {
                expect(client_mock.verify()).toBeTruthy()
            })
    })
})

describe('Lambda Handler', function () {
    let client

    beforeEach(function () {
        client = Singleton.factory({
            logger: nullLogger(),
            environment: null
        })
    })

    describe('with arguments', function() {
        let callback
        let handlerFunc

        beforeEach(function() {
            callback = () => { /**/ }
            handlerFunc = spy()
            const handler = client.lambdaHandler(handlerFunc)
            handler(1, 2, callback)
            return new Promise((resolve => {
                process.nextTick(function () {
                    resolve(true)
                })
            }))
        })

        it('calls original handler with arguments', function() {
            expect(handlerFunc.lastCall.args.length).toBe(3)
            expect(handlerFunc.lastCall.args[0]).toBe(1)
            expect(handlerFunc.lastCall.args[1]).toBe(2)
            expect(handlerFunc.lastCall.args[2]).toBe(callback)
        })
    })

    describe('async handlers', function() {

        it('calls handler with promisify', async function () {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const handler = client.lambdaHandler(async (event: any, _context: any) => {
                if(event.fail) {
                    throw new Error('this is an error');
                }
                return {
                    statusCode: 1,
                    body: 'something'
                };
            });

            const wrappedHandler = promisify(handler);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const a: any = await wrappedHandler({
                fail: 0
            }, {});
            expect(a.statusCode).toBe(1);
            expect(a.body).toBe('something');
        })

        it('calls handler with asynchronous response if no error is thrown', function () {
            client.configure({
                apiKey: 'testing'
            })

            const handler = client.lambdaHandler(async function(_event, _context) {
                return Promise.resolve({message:'works!'})
            })

            return new Promise<void>(resolve => {
                handler({}, {}, (err, res) => {
                    expect(err).toBeFalsy()
                    expect(res).toBeDefined()
                    expect(res.message).toEqual('works!')
                    resolve()
                })
            })
        })

        it('calls handler with synchronous response if no error is thrown', function () {
            client.configure({
                apiKey: 'testing'
            })

            const handler = client.lambdaHandler(async function(_event, _context) {
                return {message:'works!'}
            })

            return new Promise<void>(resolve => {
                handler({}, {}, (err, res) => {
                    expect(err).toBeFalsy()
                    expect(res).toBeDefined()
                    expect(res.message).toEqual('works!')
                    resolve()
                })
            })
        })

        it('calls handler if notify exits on preconditions', function () {
            client.configure({
                apiKey: null
            })

            const handler = client.lambdaHandler(async function(_event) {
                throw new Error("Badgers!")
            })

            return new Promise<void>(resolve => {
                handler({}, {}, (err) => {
                    expect(err).toBeDefined()
                    resolve()
                })
            })
        })

        // eslint-disable-next-line jest/expect-expect
        it('reports errors to Honeybadger', function() {
            client.configure({
                apiKey: 'testing'
            })

            nock.cleanAll()

            const api = nock("https://api.honeybadger.io")
                .post("/v1/notices/js")
                .reply(201, '{"id":"1a327bf6-e17a-40c1-ad79-404ea1489c7a"}')

            const handler = client.lambdaHandler(async function(_event) {
                throw new Error("Badgers!")
            })

            return new Promise<void>(resolve => {
                const callback = function(_err) {
                    api.done()
                    resolve()
                }
                handler({}, {}, callback)
            })
        })

        // eslint-disable-next-line jest/expect-expect
        it('reports async errors to Honeybadger', function() {
            client.configure({
                apiKey: 'testing'
            })

            nock.cleanAll()

            const api = nock("https://api.honeybadger.io")
                .post("/v1/notices/js")
                .reply(201, '{"id":"1a327bf6-e17a-40c1-ad79-404ea1489c7a"}')


            const handler = client.lambdaHandler(async function(_event) {
                setTimeout(function() {
                    throw new Error("Badgers!")
                }, 0)
            })

            return new Promise<void>(resolve => {
                const callback = function(_err) {
                    api.done()
                    resolve()
                }
                handler({}, {}, callback)
            })
        })
    })

    describe('non-async handlers', function() {

        it('calls handler with promisify', function () {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const handler = client.lambdaHandler((event: any, _context: any, callback: any) => {
                if(event.fail) {
                    throw new Error('this is an error');
                }

                callback(null, {
                    statusCode: 1,
                    body: 'something'
                })
            });

            const wrappedHandler = promisify(handler)
            return wrappedHandler({ fail: 0 }, {})
                .then(a => {
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(a.statusCode).toBe(1);
                    // eslint-disable-next-line jest/no-conditional-expect
                    expect(a.body).toBe('something');
                })
        })

        it('calls handler if no error is thrown', function () {
            client.configure({
                apiKey: 'testing'
            })

            const handler = client.lambdaHandler(function(_event, _context, callback) {
                callback(null, { message: 'works!' })
            })

            return new Promise<void>(resolve => {
                handler({}, {}, (err, res) => {
                    expect(err).toBeFalsy()
                    expect(res).toBeDefined()
                    expect(res.message).toEqual('works!')
                    resolve()
                })
            })
        })

        it('calls handler if notify exits on preconditions', function () {
            client.configure({
                apiKey: null
            })

            const handler = client.lambdaHandler(function(_event, _context, _callback) {
                throw new Error("Badgers!")
            })

            return new Promise<void>(resolve => {
                handler({}, {}, (err) => {
                    expect(err).toBeDefined()

                    //revert the client to use a key
                    client.configure({
                        apiKey: 'testing'
                    })

                    resolve()
                })
            })
        })

        // eslint-disable-next-line jest/expect-expect
        it('reports errors to Honeybadger', function() {
            client.configure({
                apiKey: 'testing'
            })

            nock.cleanAll()

            const api = nock("https://api.honeybadger.io")
                .post("/v1/notices/js")
                .reply(201, '{"id":"1a327bf6-e17a-40c1-ad79-404ea1489c7a"}')

            return new Promise<void>(resolve => {
                const callback = function(_err) {
                    api.done()
                    resolve()
                }

                const handler = client.lambdaHandler(function(_event, _context, _callback) {
                    throw new Error("Badgers!")
                })

                handler({}, {}, callback)
            })
        })

        // eslint-disable-next-line jest/expect-expect
        it('reports async errors to Honeybadger', function() {
            client.configure({
                apiKey: 'testing'
            })

            nock.cleanAll()

            const api = nock("https://api.honeybadger.io")
                .post("/v1/notices/js")
                .reply(201, '{"id":"1a327bf6-e17a-40c1-ad79-404ea1489c7a"}')

            return new Promise<void>(resolve => {
                const callback = function(_err) {
                    api.done()
                    resolve()
                }

                const handler = client.lambdaHandler(function(_event, _context, _callback) {
                    setTimeout(function() {
                        throw new Error("Badgers!")
                    }, 0)
                })

                handler({}, {}, callback)
            })
        })

    })
})
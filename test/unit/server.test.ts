import Singleton from '../../src/server'
import BaseClient from '../../src/core/client'
// @ts-ignore
import { nullLogger } from './helpers'

import {mock, spy} from 'sinon'
import nock from 'nock'

import express from 'express'
import request from 'supertest'

describe('server client', function () {
  let client

  beforeEach(function () {
    client = Singleton.factory({
      logger: nullLogger(),
      environment: null
    })
  })

  it('inherits from base client', function () {
    expect(client).toEqual(expect.any(BaseClient))
  })

  it('sets the default hostname', function () {
    expect(client.config.hostname).toEqual(expect.any(String))
  })

  it('reports an error over https by default', function () {
    client.configure({
      apiKey: 'testing'
    })

    const request = nock('https://api.honeybadger.io')
      .post('/v1/notices/js')
      .reply(201, {
        id: '48b98609-dd3b-48ee-bffc-d51f309a2dfa'
      })

    return new Promise(resolve => {
      client.afterNotify(function (_err, _notice) {
        expect(request.isDone()).toBe(true)
        resolve(true)
      })
      client.notify('testing')
    })
  })

  it('reports an error over http when configured', function () {
    client.configure({
      apiKey: 'testing',
      endpoint: 'http://api.honeybadger.io'
    })

    const request = nock('http://api.honeybadger.io')
      .post('/v1/notices/js')
      .reply(201, {
        id: '48b98609-dd3b-48ee-bffc-d51f309a2dfa'
      })

    return new Promise(resolve => {
      client.afterNotify(function (_err, _notice) {
        expect(request.isDone()).toBe(true)
        resolve(true)
      })
      client.notify('testing')
    })
  })

  it('flags app lines in the backtrace', function () {
    client.configure({
      apiKey: 'testing'
    })

    nock('https://api.honeybadger.io')
    .post('/v1/notices/js')
    .reply(201, {
      id: '48b98609-dd3b-48ee-bffc-d51f309a2dfa'
    })

    return new Promise(resolve => {
      client.notify('testing', {
        afterNotify: (err, notice) => {
          expect(err).toBeUndefined()
          expect(notice.message).toEqual('testing')
          expect(notice.backtrace[0].file).toMatch('[PROJECT_ROOT]')
          resolve(true)
        }
      })
    })
  })

  describe('afterNotify', function () {
    beforeEach(function () {
      client.configure({
        apiKey: 'testing'
      })
    })

    it('is called without an error when the request succeeds', function () {
      const id = '48b98609-dd3b-48ee-bffc-d51f309a2dfa'
      nock('https://api.honeybadger.io')
        .post('/v1/notices/js')
        .reply(201, {
          id: id
        })

      return new Promise(resolve => {
        client.afterNotify(function (err, notice) {
          expect(err).toBeUndefined()
          expect(notice.message).toEqual('testing')
          expect(notice.id).toBe(id)
          resolve(true)
        })
        client.notify('testing')
      })
    })

    it('is called with an error when the request fails', function () {
      nock('https://api.honeybadger.io')
        .post('/v1/notices/js')
        .reply(403)

      return new Promise(resolve => {
        client.afterNotify(function (err, notice) {
          expect(notice.message).toEqual('testing')
          expect(err.message).toMatch(/403/)
          resolve(true)
        })
        client.notify('testing')
      })
    })

    it('is called without an error when passed as an option and the request succeeds', function () {
      const id = '48b98609-dd3b-48ee-bffc-d51f309a2dfa'
      nock('https://api.honeybadger.io')
        .post('/v1/notices/js')
        .reply(201, {
          id: id
        })

      return new Promise(resolve => {
        client.notify('testing', {
          afterNotify: (err, notice) => {
            expect(err).toBeUndefined()
            expect(notice.message).toEqual('testing')
            expect(notice.id).toBe(id)
            resolve(true)
          }
        })
      })
    })

    it('is called with an error when passed as an option and the request fails', function () {
      nock('https://api.honeybadger.io')
        .post('/v1/notices/js')
        .reply(403)

      return new Promise(resolve => {
        client.notify('testing', {
          afterNotify: (err, notice) => {
            expect(notice.message).toEqual('testing')
            expect(err.message).toMatch(/403/)
            resolve(true)
          }
        })
      })
    })
  })

  describe('Express Middleware', function () {
    let client_mock
    const error = new Error('Badgers!')

    beforeEach(function () {
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
    describe('with arguments', function() {
      let handlerFunc

      beforeEach(function() {
        handlerFunc = spy()
        const handler = client.lambdaHandler(handlerFunc)
        handler(1, 2, 3)
        return new Promise((resolve => {
          process.nextTick(function () {
            resolve(true)
          })
        }))
      })

      it('calls original handler with arguments', function() {
        expect(handlerFunc.calledWith(1, 2, 3)).toBeTruthy()
      })
    })

    describe('async handlers', function() {

      it('calls handler if notify exits on preconditions', function (done) {
        client.configure({
          apiKey: null
        })

        const handler = client.lambdaHandler(async function(_event) {
          throw new Error("Badgers!")
        })

        handler({}, {}, (err) => {
          expect(err).toBeDefined()
          done()
        })
      })

      // eslint-disable-next-line jest/expect-expect
      it('reports errors to Honeybadger', function(done) {
        client.configure({
          apiKey: 'testing'
        })

        nock.cleanAll()

        const api = nock("https://api.honeybadger.io")
          .post("/v1/notices/js")
          .reply(201, '{"id":"1a327bf6-e17a-40c1-ad79-404ea1489c7a"}')

        const callback = function(_err) {
          api.done()
          done()
        }

        const handler = client.lambdaHandler(async function(_event) {
          throw new Error("Badgers!")
        })

        handler({}, {}, callback)
      })

      // eslint-disable-next-line jest/expect-expect
      it('reports async errors to Honeybadger', function(done) {
        client.configure({
          apiKey: 'testing'
        })

        nock.cleanAll()

        const api = nock("https://api.honeybadger.io")
          .post("/v1/notices/js")
          .reply(201, '{"id":"1a327bf6-e17a-40c1-ad79-404ea1489c7a"}')

        const callback = function(_err) {
          api.done()
          done()
        }

        const handler = client.lambdaHandler(async function(_event) {
          setTimeout(function() {
            throw new Error("Badgers!")
          }, 0)
        })

        handler({}, {}, callback)
      })
    })

    describe('non-async handlers', function() {

      it('calls handler if notify exits on preconditions', function (done) {
        client.configure({
          apiKey: null
        })

        const handler = client.lambdaHandler(function(_event, _context, _callback) {
          throw new Error("Badgers!")
        })

        handler({}, {}, (err) => {
          expect(err).toBeDefined()

          //revert the client to use a key
          client.configure({
            apiKey: 'testing'
          })

          done()
        })
      })

      // eslint-disable-next-line jest/expect-expect
      it('reports errors to Honeybadger', function(done) {
        client.configure({
          apiKey: 'testing'
        })

        nock.cleanAll()

        const api = nock("https://api.honeybadger.io")
            .post("/v1/notices/js")
            .reply(201, '{"id":"1a327bf6-e17a-40c1-ad79-404ea1489c7a"}')

        const callback = function(_err) {
          api.done()
          done()
        }

        const handler = client.lambdaHandler(function(_event, _context, _callback) {
          throw new Error("Badgers!")
        })

        handler({}, {}, callback)
      })

      // eslint-disable-next-line jest/expect-expect
      it('reports async errors to Honeybadger', function(done) {
        client.configure({
          apiKey: 'testing'
        })

        nock.cleanAll()

        const api = nock("https://api.honeybadger.io")
            .post("/v1/notices/js")
            .reply(201, '{"id":"1a327bf6-e17a-40c1-ad79-404ea1489c7a"}')

        const callback = function(_err) {
          api.done()
          done()
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

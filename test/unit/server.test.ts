import Singleton from '../../src/server'
import BaseClient from '../../src/core/client'
import { nullLogger } from './helpers'

import nock from 'nock'
import { assert } from 'console'

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

  it('reports an error over https by default', function () {
    client.configure({
      apiKey: 'testing'
    })

    const request = nock('https://api.honeybadger.io')
      .post('/v1/notices')
      .reply(201, {
        id: '48b98609-dd3b-48ee-bffc-d51f309a2dfa'
      })

    return new Promise(resolve => {
      client.afterNotify(function (_err, _notice) {
        expect(request.isDone()).toBe(true)
        resolve()
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
      .post('/v1/notices')
      .reply(201, {
        id: '48b98609-dd3b-48ee-bffc-d51f309a2dfa'
      })

    return new Promise(resolve => {
      client.afterNotify(function (_err, _notice) {
        expect(request.isDone()).toBe(true)
        resolve()
      })
      client.notify('testing')
    })
  })

  it('it flags app lines in the backtrace', function () {
    client.configure({
      apiKey: 'testing'
    })

    nock('https://api.honeybadger.io')
    .post('/v1/notices')
    .reply(201, {
      id: '48b98609-dd3b-48ee-bffc-d51f309a2dfa'
    })

    return new Promise(resolve => {
      client.notify('testing', {
        afterNotify: (err, notice) => {
          expect(err).toBeUndefined()
          expect(notice.message).toEqual('testing')
          expect(notice.backtrace[0].context).toEqual('app')
          resolve()
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
        .post('/v1/notices')
        .reply(201, {
          id: id
        })

      return new Promise(resolve => {
        client.afterNotify(function (err, notice) {
          expect(err).toBeUndefined()
          expect(notice.message).toEqual('testing')
          expect(notice.id).toBe(id)
          resolve()
        })
        client.notify('testing')
      })
    })

    it('is called with an error when the request fails', function () {
      nock('https://api.honeybadger.io')
        .post('/v1/notices')
        .reply(403)

      return new Promise(resolve => {
        client.afterNotify(function (err, notice) {
          expect(notice.message).toEqual('testing')
          expect(err.message).toMatch(/403/)
          resolve()
        })
        client.notify('testing')
      })
    })

    it('is called without an error when passed as an option and the request succeeds', function () {
      const id = '48b98609-dd3b-48ee-bffc-d51f309a2dfa'
      nock('https://api.honeybadger.io')
        .post('/v1/notices')
        .reply(201, {
          id: id
        })

      return new Promise(resolve => {
        client.notify('testing', {
          afterNotify: (err, notice) => {
            expect(err).toBeUndefined()
            expect(notice.message).toEqual('testing')
            expect(notice.id).toBe(id)
            resolve()
          }
        })
      })
    })

    it('is called with an error when passed as an option and the request fails', function () {
      nock('https://api.honeybadger.io')
        .post('/v1/notices')
        .reply(403)

      return new Promise(resolve => {
        client.notify('testing', {
          afterNotify: (err, notice) => {
            expect(notice.message).toEqual('testing')
            expect(err.message).toMatch(/403/)
            resolve()
          }
        })
      })
    })
  })
})

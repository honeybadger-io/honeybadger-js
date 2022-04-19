import { ServerTransport } from "../../../src/server/transport";
import nock from "nock";

describe('ServerTransport', function () {
    let transport: ServerTransport
    beforeAll(() => {
        transport = new ServerTransport()
    })

    it('sends GET request over the network', () => {
        const checkInId = '123'
        const request = nock('http://api.honeybadger.io')
            .get(`/v1/check_in/${checkInId}`)
            .reply(201)
        return transport
            .send({
                endpoint: `http://api.honeybadger.io/v1/check_in/${checkInId}`,
                method: 'GET',
                logger: console
            })
            .then(resp => {
                expect(request.isDone()).toBe(true)
                expect(resp.statusCode).toEqual(201)
            })

    })

    it('sends POST request over the network', () => {
        const request = nock('http://api.honeybadger.io')
            .post('/v1/notices/js')
            .reply(201, {
                id: '48b98609-dd3b-48ee-bffc-d51f309a2dfa'
            })
        return transport
            .send({
                endpoint: 'http://api.honeybadger.io/v1/notices/js',
                method: 'POST',
                logger: console
            })
            .then(resp => {
              expect(request.isDone()).toBe(true)
              expect(resp.statusCode).toEqual(201)
            })
    })

    it('sends POST request over the network with headers', () => {
        const headers = {
            'X-API-Key': '123',
            'Content-Type': 'application/json;charset=utf-8',
            'Accept': 'text/json, application/json'
        }
        const request = nock('http://api.honeybadger.io')
            .post('/v1/notices/js')
            .matchHeader('X-API-Key', '123')
            .matchHeader('Content-Type', 'application/json;charset=utf-8')
            .matchHeader('Accept', 'text/json, application/json')
            .reply(201, {
                id: '48b98609-dd3b-48ee-bffc-d51f309a2dfa'
            })
        return transport
            .send({
                endpoint: 'http://api.honeybadger.io/v1/notices/js',
                headers,
                method: 'POST',
                logger: console
            })
            .then(resp => {
                expect(request.isDone()).toBe(true)
                expect(resp.statusCode).toEqual(201)
            })
    })
});

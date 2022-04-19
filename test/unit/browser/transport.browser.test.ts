import {useFakeXMLHttpRequest} from 'sinon'
import { BrowserTransport } from "../../../src/browser/transport";

describe('BrowserTransport', function () {
    let transport: BrowserTransport
    let requests, request, xhr
    beforeAll(() => {
        transport = new BrowserTransport()
    })

    beforeEach(() => {
        // Stub HTTP requests.
        request = undefined
        requests = []
        xhr = useFakeXMLHttpRequest()
        xhr.onCreate = function (xhr) {
            request = xhr
            return requests.push(xhr)
        }
    })

    it('sends GET request over the network', () => {
        const promise = transport.send({
            method: 'GET',
            endpoint: 'my-endpoint',
            async: true,
            logger: console,
        }).then(resp => {
            expect(resp.statusCode).toEqual(201)
            return Promise.resolve()
        })

        expect(requests).toHaveLength(1)
        request.respond(201)

        return promise
    })

    it('sends POST request over the network', () => {
        const promise = transport.send({
            method: 'POST',
            endpoint: 'my-endpoint',
            async: true,
            logger: console,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }, <any>{ test: 1 }).then(resp => {
            expect(resp.statusCode).toEqual(201)
            return Promise.resolve()
        })

        expect(requests).toHaveLength(1)
        request.respond(201)

        return promise
    })

    it('sends POST request over the network with headers', () => {
        const headers = {
            'X-API-Key': '123',
            'Content-Type': 'application/json;charset=utf-8',
            'Accept': 'text/json, application/json'
        }
        const promise = transport.send({
            method: 'POST',
            endpoint: 'my-endpoint',
            headers,
            async: true,
            logger: console,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }, <any>{ test: 1 }).then(resp => {
            expect(resp.statusCode).toEqual(201)
            return Promise.resolve()
        })

        expect(requests).toHaveLength(1)
        expect(request.requestHeaders).toEqual(headers)
        request.respond(201)


        return promise
    })

    afterEach(function () {
        xhr.restore()
    })

});

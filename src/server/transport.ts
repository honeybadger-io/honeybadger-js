import { Transport, TransportOptions, TransportPayload } from "../core/types"
import { URL } from "url";
import http from "http";
import https from "https";
import { getStats } from "./util";
import { endpoint, sanitize } from "../core/util";

export class ServerTransport implements Transport {
    send(payload: TransportPayload, options: TransportOptions): Promise<{ statusCode: number; body: string; }> {
        const {protocol} = new URL(options.endpoint)
        const transport = (protocol === "http:" ? http : https)

        payload.server.pid = process.pid

        return new Promise((resolve, reject) => {
            getStats((stats) => {
                payload.server.stats = stats

                const data = Buffer.from(JSON.stringify(sanitize(payload, options.maxObjectDepth)), 'utf8')
                const httpOptions = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': data.length,
                        'X-API-Key': options.apiKey
                    }
                }

                const req = transport.request(endpoint(options.endpoint, '/v1/notices/js'), httpOptions, (res) => {
                    options.logger.debug(`statusCode: ${res.statusCode}`)

                    let body = ''
                    res.on('data', (chunk) => {
                        body += chunk
                    })

                    res.on('end', () => resolve({ statusCode: res.statusCode, body }))
                })

                req.on('error', (err) => reject(err))

                req.write(data)
                req.end()
            })
        })
    }
}

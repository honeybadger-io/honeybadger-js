import { Transport, TransportOptions, TransportPayload } from "../core/types";
import { endpoint, sanitize } from "../core/util";

export class BrowserTransport implements Transport {
    send(payload: TransportPayload, options: TransportOptions): Promise<{ statusCode: number; body: string; }> {
        return new Promise((resolve, reject) => {
            try {
                const x = new XMLHttpRequest()
                x.open('POST', endpoint(options.endpoint, '/v1/notices/js'), options.async)

                x.setRequestHeader('X-API-Key', options.apiKey)
                x.setRequestHeader('Content-Type', 'application/json')
                x.setRequestHeader('Accept', 'text/json, application/json')

                x.send(JSON.stringify(sanitize(payload, options.maxObjectDepth)))
                x.onload = () => resolve({ statusCode: x.status, body: x.response })
            } catch (err) {
                reject(err)
            }
        })
    }
}

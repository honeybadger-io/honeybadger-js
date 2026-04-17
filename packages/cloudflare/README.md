# Honeybadger Cloudflare Workers Integration

![Node CI](https://github.com/honeybadger-io/honeybadger-js/workflows/Node%20CI/badge.svg)
[![npm version](https://badge.fury.io/js/%40honeybadger-io%2Fcloudflare.svg)](https://badge.fury.io/js/%40honeybadger-io%2Fcloudflare)
[![npm dm](https://img.shields.io/npm/dm/@honeybadger-io/cloudflare)](https://www.npmjs.com/package/@honeybadger-io/cloudflare)
[![npm dt](https://img.shields.io/npm/dt/@honeybadger-io/cloudflare)](https://www.npmjs.com/package/@honeybadger-io/cloudflare)

Error monitoring for [Cloudflare Workers](https://developers.cloudflare.com/workers/) via Honeybadger.

## Documentation and Support

For full documentation and support, see [Honeybadger's JavaScript docs](https://docs.honeybadger.io/lib/javascript).

## Installation

```bash
npm install @honeybadger-io/cloudflare
```

## Usage

Wrap your Worker's exported handler with `withHoneybadger`. Pass a `getConfig` function that receives your `env` and returns Honeybadger config overrides (e.g. `apiKey`, `environment`).

Set the API key via [Wrangler secrets](https://developers.cloudflare.com/workers/configuration/secrets/):

```bash
wrangler secret put HONEYBADGER_API_KEY
```

Pass any `(env) => Partial<Config>` to control Honeybadger config from your env:

```typescript
import { withHoneybadger } from '@honeybadger-io/cloudflare'
import type { Types } from '@honeybadger-io/core'

const getConfig = (env: Env): Partial<Types.Config> => ({
  apiKey: env.HONEYBADGER_API_KEY,
  environment: env.ENVIRONMENT ?? 'production',
  revision: env.GIT_SHA,
})

export default withHoneybadger(getConfig, {
  async fetch(request, env, ctx) {
    // ...
  },
  async scheduled(controller, env, ctx) {
    // ...
  },
})
```

## Supported handlers

`withHoneybadger` wraps all handlers present on your export: **fetch**, **scheduled**, **queue**, **email**, and **tail**. Errors in any handler are reported to Honeybadger and rethrown; reporting runs via `ctx.waitUntil()` so it does not block the response.

## License

This package is MIT licensed. See the [MIT-LICENSE](./MIT-LICENSE) file in this folder for details.

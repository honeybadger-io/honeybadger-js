# Honeybadger Next.js Integration

![Node CI](https://github.com/honeybadger-io/honeybadger-js/workflows/Node%20CI/badge.svg)
[![npm version](https://badge.fury.io/js/%40honeybadger-io%2Fnextjs.svg)](https://badge.fury.io/js/%40honeybadger-io%2Fnextjs)
[![npm dm](https://img.shields.io/npm/dm/@honeybadger-io/nextjs)](https://www.npmjs.com/package/@honeybadger-io/nextjs)
[![npm dt](https://img.shields.io/npm/dt/@honeybadger-io/nextjs)](https://www.npmjs.com/package/@honeybadger-io/nextjs)

## Documentation and Support

For comprehensive documentation and support, [check out our documentation site](https://docs.honeybadger.io/lib/javascript).

The documentation includes a detailed [Next.js integration guide](https://docs.honeybadger.io/lib/javascript/integration/nextjs).

## Project Goals

The goal is to provide an idiomatic, simple integration of Honeybadger's
exception monitoring service with Next.js applications.

## Project Status

This version is considered suitable for preview.

## Features

- Automatic reporting of uncaught server errors via Next.js's `onRequestError` hook —
  including Server Components, Route Handlers, Server Actions and middleware
- Client-side error reporting configured before React hydrates
- Breadcrumbs, including App Router navigations
- `request_id`, `correlation_id`, `trace_id` and `span_id` on every fault, matching the
  `request.handled` Insights event for the same request
- Source map upload to Honeybadger
- CLI command to generate the Honeybadger instrumentation and configuration files

## Requirements

Next.js 15.4 or later, and Node.js 20.9 or later. Both Turbopack and webpack builds are
supported.

Earlier versions of this package instrumented the app by injecting configuration files into
webpack entry points. Turbopack ignores `config.webpack` entirely, so that approach silently
stopped working once Turbopack became the default builder in Next.js 16. Setup now uses the
bundler-agnostic [`instrumentation`](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation)
and [`instrumentation-client`](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client)
conventions instead. See
[issue #1434](https://github.com/honeybadger-io/honeybadger-js/issues/1434).

## Source maps

Source maps are uploaded automatically after a production build. `withHoneybadgerConfig`
registers Next.js's `compiler.runAfterProductionCompile` hook, which runs for Turbopack and
webpack builds alike — the webpack plugin it replaces only ever ran for webpack, and
Turbopack silently ignored it.

Set the API key and the URL your assets are served from, either as options or via
`NEXT_PUBLIC_HONEYBADGER_API_KEY` and `NEXT_PUBLIC_HONEYBADGER_ASSETS_URL`:

```js
// next.config.js
const { withHoneybadgerConfig } = require('@honeybadger-io/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... your existing Next.js config
}

module.exports = withHoneybadgerConfig(nextConfig, {
  apiKey: process.env.NEXT_PUBLIC_HONEYBADGER_API_KEY,
  assetsUrl: process.env.NEXT_PUBLIC_HONEYBADGER_ASSETS_URL,
  revision: process.env.NEXT_PUBLIC_HONEYBADGER_REVISION,
})
```

`assetsUrl` is the public URL of the build output, normally `https://your-site.com/_next`.

> **Requires `next >= 15.4.0`**, the version that introduced
> `compiler.runAfterProductionCompile`. This is declared as a peer dependency, and it
> matters for more than just the upload: on an older Next.js, `withHoneybadgerConfig` still
> switches `productionBrowserSourceMaps` on, but the hook that uploads *and then deletes*
> the maps never runs — so the maps would be served publicly. Either upgrade, or set
> `disableSourceMapUpload: true`.

Nothing is uploaded, and no warning is raised beyond a single message, if those two values
are missing — so the hook is safe to leave registered in a project that does not use it.
Set `disableSourceMapUpload: true` to turn it off explicitly.

### Both browser and server maps are uploaded

Next.js emits no source maps in a production build unless asked, so there would be nothing
to upload. When upload is configured this package turns on both switches for you:

| Option | Covers | Emitted to |
| --- | --- | --- |
| `productionBrowserSourceMaps` | the browser build | `.next/static`, which **is** served publicly |
| `experimental.serverSourceMaps` | the server build | `.next/server`, which is not served |

Server maps matter because server-side frames stay minified without them. The webpack
plugin this replaces set `devtool: 'hidden-source-map'` for every compilation, so it
generated server maps even though it only ever uploaded the browser ones — see
[#1602](https://github.com/honeybadger-io/honeybadger-js/issues/1602).

> **Note:** server frames are not symbolicated yet. Uploading the maps is only half of it;
> the frame URLs reported at runtime still need to line up with the `minified_url` the maps
> were uploaded under, which is the second half of
> [#1602](https://github.com/honeybadger-io/honeybadger-js/issues/1602). Browser frames
> symbolicate today.

If you set either option yourself, that is treated as a deliberate choice and the value is
left exactly as you wrote it.

### Browser maps are removed after upload

Because `productionBrowserSourceMaps` also *serves* the maps it generates, the browser maps
are **deleted from the build output once they have been uploaded**, so they are not exposed
to visitors. That reproduces the behaviour of `hidden-source-map`, which Turbopack has no
equivalent for.

Two things are deliberately left alone:

- **Server maps.** `.next/server` is not served, so there is no exposure to undo, and
  Next.js reads those maps itself when formatting server-side stack traces.
- **Maps you asked for.** If you set `productionBrowserSourceMaps: true` yourself, your
  maps are uploaded but not deleted.

A failed upload fails the build, because Next.js re-throws whatever this hook throws. Set
`ignoreErrors: true` in the options if you would rather a Honeybadger outage did not block
a deploy.

## Limitations

- Server-side frames are not symbolicated. The source maps for `.next/server` are uploaded,
  but the frame paths reported at runtime do not yet match the `minified_url` they were
  uploaded under — tracked in
  [#1602](https://github.com/honeybadger-io/honeybadger-js/issues/1602). Browser frames
  symbolicate.
- The deprecated `export const runtime = 'edge'` for route handlers is no longer covered by a
  configuration template or example. Middleware and `instrumentation`, which Next.js also
  compiles for an edge context, are supported.

## Example app

A separate repository, [nextjs-with-honeybadger](https://github.com/honeybadger-io/nextjs-with-honeybadger) exists with an example app using this package.
Follow the README instructions to run the example app.

## Development

```bash
# install dependencies
npm install

# build for production
npm run build
```

### License

This package is MIT licensed. See the [MIT-LICENSE](./MIT-LICENSE) file in this folder for details.

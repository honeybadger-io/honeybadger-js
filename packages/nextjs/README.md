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
  including Server Components, Route Handlers, Server Actions, middleware and the edge runtime
- Client-side error reporting configured before React hydrates
- Breadcrumbs, including App Router navigations
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

## Limitations

- [Issue link](https://github.com/honeybadger-io/honeybadger-js/issues/1056): Source maps for the [Edge runtime](https://vercel.com/docs/concepts/functions/edge-functions/edge-runtime) are not supported yet.

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

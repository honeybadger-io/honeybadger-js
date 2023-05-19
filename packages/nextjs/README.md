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

- Automatic reporting of uncaught exceptions (see [Limitations](#limitations))
- Breadcrumbs
- Source map upload to Honeybadger
- CLI command to generate Honeybadger configuration files for Next.js runtimes

## Limitations

The following limitations are known to exist and will be tackled in future releases:

- [Issue link](https://github.com/honeybadger-io/honeybadger-js/issues/1055): A custom error component is used to report uncaught exceptions to Honeybadger. 
  This is necessary because Next.js does not provide a way to hook into the error handler.
  This is not a catch-all errors solution.  
  If you are using the _Pages Router_, there are some caveats to this approach, as reported [here](https://nextjs.org/docs/advanced-features/custom-error-page#caveats).
  This is a limitation of Next.js, not Honeybadger's Next.js integration.
  Errors thrown in middlewares or API routes will not be reported to Honeybadger, since when they reach the error component, the response status code is 404 and no error information is available.
  Additionally, there is an open [issue](https://github.com/vercel/next.js/issues/45535) about 404 being reported with Next.js apps deployed on Vercel, when they should be reported as 500.  
  If you are using the _App Router_, these limitations do not apply, because errors thrown in middlewares or API routes do not reach the custom error component but are caught by the global `window.onerror` handler.
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

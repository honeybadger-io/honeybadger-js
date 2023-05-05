# Honeybadger React.js Integration

![Node CI](https://github.com/honeybadger-io/honeybadger-js/workflows/Node%20CI/badge.svg)
[![npm version](https://badge.fury.io/js/%40honeybadger-io%2Freact.svg)](https://badge.fury.io/js/%40honeybadger-io%2Freact)
[![npm dm](https://img.shields.io/npm/dm/@honeybadger-io/react)](https://www.npmjs.com/package/@honeybadger-io/react)
[![npm dt](https://img.shields.io/npm/dt/@honeybadger-io/react)](https://www.npmjs.com/package/@honeybadger-io/react)

> [React.js Integration for Honeybadger.io](https://www.honeybadger.io/for/javascript/?utm_source=github&utm_medium=readme&utm_campaign=react&utm_content=React.js+integration+for+Honeybadger.io)

## Documentation and Support

For comprehensive documentation and support, [check out our documentation site](https://docs.honeybadger.io/lib/javascript).

The documentation includes a detailed [React integration guide](https://docs.honeybadger.io/lib/javascript/integration/react)

## Project Goals

The goal is to provide an idiomatic, simple integration of Honeybadger's
exception monitoring service with React.js applications.

## Project Status

This version is considered suitable for preview.

## Limitations

Honeybadger-react hooks in to the error handler in React. This means we only
notify Honeybadger of React context for errors that React handles. Some
errors inside React code may propagate to the window onerror handler
instead.

In those cases, Honeybadger Javascript library's default error notifier
is invoked, which will contain a stack trace but none of the React
variables.

## Key Assumptions

This project is built using create-react-library with rollup and generates
artifacts in commonjs, esm and umd formats. It's possible
your own build environment may be just different enough to require some
adjustments. If you find that our artifacts don't quite meet your needs,
please [file an issue on GitHub](https://github.com/honeybadger-io/honeybadger-react/issues).

## Example app

There's a minimal implementation of a honeybadger-react integration in the ./example
folder. If you want to contribute a patch to honeybadger-react, it can be useful to have
the demo app running.

To run it, issue these commands from your shell:

```bash
cd example
npm install
REACT_APP_HONEYBADGER_API_KEY=b425b636 npm run start
```

This will serve the demo app with hot reload at localhost:3000

For a detailed explanation on how hot reloading works, check out the [documentation](https://webpack.js.org/concepts/hot-module-replacement/).

## Development

``` bash
# install dependencies
npm install

# build for production
npm run build

# run unit tests
npm test

# automatically continuously rebuild the dist/ artifacts with hot reload when developing
npm run start
```

### License

This package is MIT licensed. See the [MIT-LICENSE](./MIT-LICENSE) file in this folder for details.

# Honeybadger Vue.js Integration
![Node CI](https://github.com/honeybadger-io/honeybadger-js/workflows/Node%20CI/badge.svg)
[![npm version](https://badge.fury.io/js/%40honeybadger-io%2Fvue.svg)](https://badge.fury.io/js/%40honeybadger-io%2Fvue)
[![npm dm](https://img.shields.io/npm/dm/@honeybadger-io/vue)](https://www.npmjs.com/package/@honeybadger-io/vue)
[![npm dt](https://img.shields.io/npm/dt/@honeybadger-io/vue)](https://www.npmjs.com/package/@honeybadger-io/vue)

[Vue.js integration for Honeybadger.io](https://www.honeybadger.io/for/javascript/?utm_source=github&utm_medium=readme&utm_campaign=vue&utm_content=Vue.js+integration+for+Honeybadger.io)

> **Note:** Since v3.2 release of this project, both Vue.js v2.x and v3.x are supported!

## Documentation and Support

For comprehensive documentation and support, [check out our documentation site](https://docs.honeybadger.io/lib/javascript/index.html).

The documentation includes detailed Vue Integration Guides, both for Vue.js [v2.x](https://docs.honeybadger.io/lib/javascript/integration/vue2.html) and [v3.x](https://docs.honeybadger.io/lib/javascript/integration/vue3.html).

## Project Goals

The goal is to provide an idiomatic, simple integration of Honeybadger's
exception monitoring service with Vue.js applications.

## Project Status

This version is considered suitable for preview.

## Limitations

Honeybadger-vue hooks in to the error handler in Vue. This means we only
notify Honeybadger of Vue context for errors that Vue handles. Some
errors inside Vue code may propagate to the window onerror handler
instead.

In those cases, Honeybadger JavaScript library's default error notifier
is invoked, which will contain a stack trace but none of the Vue
variables.

## Key Assumptions

This project is built using a webpack-based Vue template. It's possible
your own build environment may be just different enough to require some
adjustments. If you find that our artifacts don't quite meet your needs,
please [file an issue on GitHub](https://github.com/honeybadger-io/honeybadger-js/issues).

## Development

``` bash
# install dependencies
npm install

# Serve the demo app with hot reload at localhost:8080
HONEYBADGER_API_KEY=yourkey npm run dev

# build for production with minification
npm run build

# build for production and view the bundle analyzer report
npm run build --report

# run unit tests
npm run unit

# run all tests
HONEYBADGER_API_KEY=yourkey npm run test:all
```

For a detailed explanation on how things work, check out the [guide](http://vuejs-templates.github.io/webpack/) and [docs for vue-loader](http://vuejs.github.io/vue-loader).

## License

This package is MIT licensed. See the [MIT-LICENSE](./MIT-LICENSE) file in this folder for details.

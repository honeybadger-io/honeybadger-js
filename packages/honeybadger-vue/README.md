# Honeybadger Vue.js Integration
[![Build Status](https://travis-ci.org/honeybadger-io/honeybadger-vue.svg?branch=master)](https://travis-ci.org/honeybadger-io/honeybadger-vue)

> [Vue.js integration for Honeybadger.io](https://www.honeybadger.io/for/javascript/?utm_source=github&utm_medium=readme&utm_campaign=vue&utm_content=Vue.js+integration+for+Honeybadger.io)

## Documentation and Support

For comprehensive documentation and support, [check out our documentation site](https://docs.honeybadger.io/lib/javascript/index.html).

The documentation includes a detailed [Vue integration guide](https://docs.honeybadger.io/lib/javascript/integration/vue.html)

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

In those cases, Honeybadger Javascript library's default error notifier
is invoked, which will contain a stack trace but none of the Vue
variables.

## Key Assumptions

This project is built using a webpack-based Vue template. It's possible
your own build environment may be just different enough to require some
adjustments. If you find that our artifacts don't quite meet your needs,
please [file an issue on GitHub](https://github.com/honeybadger-io/honeybadger-vue/issues).

## Changelog

See https://github.com/honeybadger-io/honeybadger-vue/blob/master/CHANGELOG.md

## Contributing

1. Fork it.
2. Create a topic branch `git checkout -b my_branch`
3. Commit your changes `git commit -am "Boom"`
3. Push to your branch `git push origin my_branch`
4. Send a [pull request](https://github.com/honeybadger-io/honeybadger-vue/pulls)

## Development

``` bash
# install dependencies
yarn install

# Serve the demo app with hot reload at localhost:8080
HONEYBADGER_API_KEY=yourkey yarn run dev

# build for production with minification
yarn run build

# build for production and view the bundle analyzer report
yarn run build --report

# run unit tests
yarn run unit

# run e2e tests
HONEYBADGER_API_KEY=yourkey yarn run e2e

# run all tests
HONEYBADGER_API_KEY=yourkey yarn test:all
```

For a detailed explanation on how things work, check out the [guide](http://vuejs-templates.github.io/webpack/) and [docs for vue-loader](http://vuejs.github.io/vue-loader).

### License

*honeybadger-vue* is MIT licensed. See the [LICENSE](https://raw.github.com/honeybadger-io/honeybadger-vue/master/LICENSE) file in this repository for details.

# honeybadger-vue

> Honeybadger.io integration for Vue.js

## Project Goals

The goal is to provide an idiomatic, simple integration of Honeybadger's
exception monitoring service with Vue.js applications.

## Project Status

This version is considered suitable for preview.

## Getting Started

If you're using webpack, simply add honeybadger-vue as a dependency and
configure.

```
npm add honeybadger-vue --save
```

In your main.js:

```javascript
import HoneybadgerVue from 'honeybadger-vue'

const config = {
    api_key: 'your-public-api-key',
    environment: 'production',
    revision: 'git SHA/project version'
}

Vue.use(HoneybadgerVue, config)
```

If you're building a Vue app that just uses `<script>` tags to pull in
the vue library, you may reference the library on a CDN instead.

## Limitations

Honeybadger-vue hooks in to the error handler in Vue. This means we only
notify Honeybadger of Vue context for errors that Vue handles. Some
errors inside Vue code may propagate to the window onerror handler
instead.

In those cases, Honeybadger Javascript library's default error notifier
is invoked, which will contain a stack trace but none of the Vue
variables.

## Usage

Using the example configuration above, you'll install honeybadger-vue
as Vue's error handler.

If, for some reason, you do not wish to install Honeybadger's
error handler on the global window onerror handler, you may add
```{ onerror: false }``` to the configuration you're invoking. Because
not all Vue errors bubble up through the `Vue.config.errorHandler`,
please consider the use case carefully. It may make sense to disable
the window.onerror handler if you have a hybrid application with its
own error handler, for example.

You may also manually report errors by directly invoking the
honeybadger-js API.

```javascript
    Vue.$honeybadger.notify(error)
```

See the honeybadger-js documentation for more options.

## Key Assumptions

This project is built using a webpack-based Vue template. It's possible
your own build environment may be just different enough to require some
adjustments. If you find that our artifacts don't quite meet your needs,
please [file an issue on GitHub](https://github.com/honeybadger-io/honeybadger-vue/issues.

## Documentation and Support

For comprehensive documentation and support, [check out our documentation site](http://docs.honeybadger.io/).

The documentation includes a detailed [Vue integration guide](http://docs.honeybadger.io/lib/javascript/integration/vue.html))

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
npm install

# Serve the demo app with hot reload at localhost:8080
HONEYBADGER_API_KEY=yourkey npm run dev

# build for production with minification
npm run build

# build for production and view the bundle analyzer report
npm run build --report

# run unit tests
npm run unit

# run e2e tests
HONEYBADGER_API_KEY=yourkey npm run e2e

# run all tests
HONEYBADGER_API_KEY=yourkey npm test
```

For a detailed explanation on how things work, check out the [guide](http://vuejs-templates.github.io/webpack/) and [docs for vue-loader](http://vuejs.github.io/vue-loader).

### License

The Honeybadger gem is MIT licensed. See the [LICENSE](https://raw.github.com/honeybadger-io/honeybadger-vue/master/LICENSE) file in this repository for details.

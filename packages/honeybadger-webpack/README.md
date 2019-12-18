# Honeybadger's Webpack Source Map Plugin

[![Build Status](https://img.shields.io/endpoint.svg?url=https%3A%2F%2Factions-badge.atrox.dev%2Fhoneybadger-io%2Fhoneybadger-webpack%2Fbadge%3Fref%3Dmaster&style=flat)](https://actions-badge.atrox.dev/honeybadger-io/honeybadger-webpack/goto?ref=master)
[![npm version](https://badge.fury.io/js/%40honeybadger-io%2Fwebpack.svg)](https://badge.fury.io/js/%40honeybadger-io%2Fwebpack)

This is a [webpack](https://webpack.js.org/) plugin to upload javascript
sourcemaps to [Honeybadger's](https://honeybadger.io/)
[API endpoint for source maps](https://docs.honeybadger.io/guides/source-maps.html).

Word Up! to the [thredUP](https://github.com/thredup) development team for a
similar webpack plugin they have authored.

## Installation

Installing via Node.js

```
npm install @honeybadger-io/webpack --save-dev
```

## Configuration

### Plugin parameters

These plugin parameters correspond to the [Honeybadger Sourcemap API](https://docs.honeybadger.io/guides/source-maps.html).

<dl>
  <dt><code>apiKey</code> (required)</dt>
  <dd>The API key of your Honeybadger project</dd>

  <dt><code>assetsUrl</code> (required)</dt>
  <dd>The base URL to production assets (scheme://host/path)<code>*</code><a href="https://docs.honeybadger.io/guides/source-maps.html#wildcards">wildcards</a> are supported. The plugin combines <code>assetsUrl</code> with the generated minified js file name to build the API parameter <code>minified_url</code></dd>

  <dt><code>revision</code> (optional &mdash; default: "master")</dt>
  <dd>The deploy revision (i.e. commit sha) that your source map applies to. This could also be a code version. For best results, set it to something unique every time your code changes.</dd>

  <dt><code>silent</code> (optional &mdash; default: "null/false")</dt>
  <dd>If true, silence log information emitted by the plugin.</dd>

  <dt><code>ignoreErrors</code> (optional &mdash; default: "null/false")</dt>
  <dd>If true, webpack compilation errors are treated as warnings.</dd>
</dl>

### Vanilla webpack.config.js

```javascript
const HoneybadgerSourceMapPlugin = require('@honeybadger-io/webpack')
const ASSETS_URL = 'https://cdn.example.com/assets';
const webpackConfig = {
  plugins: [new HoneybadgerSourceMapPlugin({
    apiKey: 'abc123',
    assetsUrl: ASSETS_URL,
    revision: 'master'
  })]
}
```

### Rails Webpacker config/webpack/environment.js

```javascript
const { environment } = require('@rails/webpacker')
const HoneybadgerSourceMapPlugin = require('@honeybadger-io/webpack')

// See Heroku notes in README https://github.com/honeybadger-io/honeybadger-rails-webpacker-example
// Assumes Heroku / 12-factor application style ENV variables
// named GIT_COMMIT, HONEYBADGER_API_KEY, ASSETS_URL
const revision = process.env.GIT_COMMIT || 'master'

environment.plugins.append(
  'HoneybadgerSourceMap',
  new HoneybadgerSourceMapPlugin({
    apiKey: process.env.HONEYBADGER_API_KEY,
    assetsUrl: process.env.ASSETS_URL,
    silent: false,
    ignoreErrors: false,
    revision: revision
  }))

module.exports = environment
```

See example Rails 5 application
https://github.com/honeybadger-io/honeybadger-rails-webpacker-example

## Contributing

1. Fork it.
2. Create a topic branch `git checkout -b my_branch`
3. Commit your changes `git commit -am "Boom"`
3. Push to your branch `git push origin my_branch`
4. Send a [pull request](https://github.com/honeybadger-io/honeybadger-webpack/pulls)

## Development

1. Run `npm install`
2. Run the tests with `npm test`
3. Build/test on save with `npm run build:watch` and `npm run test:watch`

## Releasing

1. With a clean working tree, use `npm version [new version]` to bump the version,
   commit the changes, tag the release, and push to GitHub. See `npm help version`
   for documentation.
2. To publish the release, use `npm publish`. See `npm help publish` for
   documentation.


## License

The Honeybadger's Webpack Source Map Plugin is MIT licensed. See the
[MIT-LICENSE](https://raw.github.com/honeybadger-io/honeybadger-webpack/master/MIT-LICENSE)
file in this repository for details.

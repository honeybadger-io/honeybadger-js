# Honeybadger's Webpack Source Map Plugin

![Node CI](https://github.com/honeybadger-io/honeybadger-js/workflows/Node%20CI/badge.svg)
[![npm version](https://badge.fury.io/js/%40honeybadger-io%2Fwebpack.svg)](https://badge.fury.io/js/%40honeybadger-io%2Fwebpack)
[![npm dm](https://img.shields.io/npm/dm/@honeybadger-io/webpack)](https://www.npmjs.com/package/@honeybadger-io/webpack)
[![npm dt](https://img.shields.io/npm/dt/@honeybadger-io/webpack)](https://www.npmjs.com/package/@honeybadger-io/webpack)

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

## Development

1. Run `npm install`
2. Run the tests with `npm test`
3. Build/test on save with `npm run build:watch` and `npm run test:watch`.

## License

This package is MIT licensed. See the [MIT-LICENSE](./MIT-LICENSE) file in this folder for details.
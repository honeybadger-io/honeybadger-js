# Honeybadger's Webpack Source Map Plugin

![Node CI](https://github.com/honeybadger-io/honeybadger-js/workflows/Node%20CI/badge.svg)
[![npm version](https://badge.fury.io/js/%40honeybadger-io%2Fwebpack.svg)](https://badge.fury.io/js/%40honeybadger-io%2Fwebpack)
[![npm dm](https://img.shields.io/npm/dm/@honeybadger-io/webpack)](https://www.npmjs.com/package/@honeybadger-io/webpack)
[![npm dt](https://img.shields.io/npm/dt/@honeybadger-io/webpack)](https://www.npmjs.com/package/@honeybadger-io/webpack)

[Webpack](https://webpack.js.org/) plugin to upload JavaScript
sourcemaps to [Honeybadger](https://docs.honeybadger.io/guides/source-maps.html). You can also send [deployment notifications](https://docs.honeybadger.io/api/deployments.html).

Word Up! to the [thredUP](https://github.com/thredup) development team for a
similar webpack plugin they have authored.

## Installation

```
# npm
npm install @honeybadger-io/webpack --save-dev

# yarn
yarn add @honeybadger-io/webpack --dev
```

## Configuration

### Plugin parameters

These plugin parameters correspond to the Honeybadger [Source Map Upload API](https://docs.honeybadger.io/api/reporting-source-maps/) and [Deployments API](https://docs.honeybadger.io/api/deployments.html).

<dl>
  <dt><code>apiKey</code> (required)</dt>
  <dd>The API key of your Honeybadger project</dd>

  <dt><code>assetsUrl</code> (required)</dt>
  <dd>The base URL to production assets (scheme://host/path)<code>*</code><a href="https://docs.honeybadger.io/api/reporting-source-maps/#wildcards">wildcards</a> are supported. The plugin combines <code>assetsUrl</code> with the generated minified js file name to build the API parameter <code>minified_url</code></dd>

  <dt><code>endpoint</code> (optional &mdash; default: "https://api.honeybadger.io/v1/source_maps")</dt>
  <dd>Where to upload your sourcemaps to. Perhaps you have a self hosted
  sourcemap server you would like to upload your sourcemaps to instead
  of honeybadger.</dd>

  <dt><code>revision</code> (optional &mdash; default: "main")</dt>
  <dd>The deploy revision (i.e. commit hash) that your source map applies to. This could also be a code version. For best results, set it to something unique every time your code changes. <a href="https://docs.honeybadger.io/lib/javascript/guides/using-source-maps.html#versioning-your-project">See the Honeybadger docs for examples.</a></dd>

  <dt><code>silent</code> (optional &mdash; default: "null/false")</dt>
  <dd>If true, silence log information emitted by the plugin.</dd>

  <dt><code>ignoreErrors</code> (optional &mdash; default: false)</dt>
  <dd>If true, webpack compilation errors are treated as warnings.</dd>

  <dt><code>retries</code> (optional &mdash; default: 3, max: 10)</dt>
  <dd>This package implements fetch retry functionality via
  https://github.com/vercel/fetch-retry </br>
  Retrying helps fix issues like `ECONNRESET` and `SOCKETTIMEOUT`
  errors and retries on 429 and 500 errors as well.
  </dd>

  <dt><code>workerCount</code> (optional &mdash; default: 5, min: 1)</dt>
  <dd>Sourcemaps are uploaded in parallel by a configurable number of 
  workers. Increase or decrease this value to configure how many sourcemaps
  are being uploaded in parallel.</br>
  Limited parallelism helps with connection issues in Docker environments.</dd>

  <dt><code>deploy</code> (optional &mdash; default: false)</dt>
  <dd>
  Configuration for deployment notifications. To disable deployment notifications, ignore this option. To enable deployment notifications, set this to <code>true</code>, or to an object containing any of these fields (see the <a href="https://docs.honeybadger.io/api/deployments.html">API reference</a>):</br>

  <dl>
    <dt><code>environment</code></dt>
    <dd>The environment name, for example, "production"</dd>
    <dt><code>repository</code></dt>
    <dd>The base URL of the VCS repository (HTTPS-style), for example, "https://github.com/yourusername/yourrepo"</dd>
    <dt><code>localUsername</code></dt>
    <dd>The name of the user that triggered this deploy, for example, "Jane"</dd>
  </dl>
  </dd>
</dl>

### Vanilla webpack.config.js

```javascript
const HoneybadgerSourceMapPlugin = require('@honeybadger-io/webpack')
const ASSETS_URL = 'https://cdn.example.com/assets';
const webpackConfig = {
  plugins: [new HoneybadgerSourceMapPlugin({
    apiKey: 'abc123',
    assetsUrl: ASSETS_URL,
    revision: 'main',
    // You can also enable deployment notifications:
    deploy: {
       environment: process.env.NODE_ENV,
       repository: "https://github.com/yourusername/yourrepo"
    }
  })]
}
```

### Rails Webpacker config/webpack/environment.js

```javascript
const { environment } = require('@rails/webpacker')
const HoneybadgerSourceMapPlugin = require('@honeybadger-io/webpack')

// Assumes Heroku / 12-factor application style ENV variables
// named GIT_COMMIT, HONEYBADGER_API_KEY, ASSETS_URL
const revision = process.env.GIT_COMMIT || 'main'

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
3. Build/test on save with `npm run build:watch` and `npm run test:watch`

## License

This package is MIT licensed. See the [MIT-LICENSE](./MIT-LICENSE) file in this folder for details.

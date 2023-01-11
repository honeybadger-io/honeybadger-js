# Honeybadger's Rollup Source Map Plugin

[Rollup](https://rollupjs.org/) plugin to upload JavaScript
sourcemaps to [Honeybadger](https://docs.honeybadger.io/lib/javascript/guides/using-source-maps/). You can also send [deployment notifications](https://docs.honeybadger.io/api/deployments.html).

## Installation

```
# npm
npm install @honeybadger-io/rollup-plugin --save-dev

# yarn
yarn add @honeybadger-io/rollup-plugin --dev
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

  <dt><code>revision</code> (optional &mdash; default: "master")</dt>
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

### rollup.config.js

```javascript
//TODO
```

### Using Vite

```javascript
//TODO
```

## Development

1. Run `npm install`
2. Run the tests with `npm test`
3. Build/test on save with `npm run build:watch` and `npm run test:watch`

## License

This package is MIT licensed. See the [MIT-LICENSE](./MIT-LICENSE) file in this folder for details.

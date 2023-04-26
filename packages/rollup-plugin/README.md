# Honeybadger's Rollup Source Map Plugin

[Rollup](https://rollupjs.org/) plugin to upload JavaScript
sourcemaps and optionally send deployment notifications to [Honeybadger](https://docs.honeybadger.io/lib/javascript/guides/using-source-maps/). 

## Installation

```
# npm
npm install @honeybadger-io/rollup-plugin --save-dev

# yarn
yarn add @honeybadger-io/rollup-plugin --dev
```


## Configuration

### Plugin parameters

These plugin parameters correspond to the Honeybadger [Source Map Upload API](https://docs.honeybadger.io/api/reporting-source-maps/) and [Deployments API](https://docs.honeybadger.io/api/reporting-deployments/).

<dl>
  <dt><code>apiKey</code> (required)</dt>
  <dd>The API key of your Honeybadger project</dd>

  <dt><code>assetsUrl</code> (required)</dt>
  <dd>The base URL to production assets (scheme://host/path)<code>*</code><a href="https://docs.honeybadger.io/api/reporting-source-maps/#wildcards">wildcards</a> are supported. The plugin combines <code>assetsUrl</code> with the generated minified js file name to build the API parameter <code>minified_url</code></dd>

  <dt><code>endpoint</code> (optional &mdash; default: "https://api.honeybadger.io/v1/source_maps")</dt>
  <dd>Where to upload your sourcemaps to. Perhaps you have a self hosted
  sourcemap server you would like to upload your sourcemaps to instead
  of Honeybadger.</dd>

  <dt><code>revision</code> (optional &mdash; default: "main")</dt>
  <dd>The deploy revision (i.e. commit hash) that your source map applies to. This could also be a code version. For best results, set it to something unique every time your code changes. <a href="https://docs.honeybadger.io/lib/javascript/guides/using-source-maps.html#versioning-your-project">See the Honeybadger docs for examples</a>.</dd>

  <dt><code>silent</code> (optional &mdash; default: false)</dt>
  <dd>If true, silence logging emitted by the plugin.</dd>

  <dt><code>retries</code> (optional &mdash; default: 3, max: 10)</dt>
  <dd>This package implements fetch retry functionality via the <a href="https://github.com/vercel/fetch-retry">fetch-retry</a> package. Retrying helps fix issues like `ECONNRESET` and `SOCKETTIMEOUT` errors.
  </dd>

  <dt><code>ignorePaths</code> (optional &mdash; default: [])</dt>
  <dd>An array of paths to ignore when uploading sourcemaps. Regex is also supported.
  </dd>

  <dt><code>deployEndpoint</code> (optional &mdash; default: "https://api.honeybadger.io/v1/deploys")</dt>
  <dd>Where to send deployment notifications.</dd>

  <dt><code>deploy</code> (optional &mdash; default: false)</dt>
  <dd>
  Configuration for <a href="https://docs.honeybadger.io/api/reporting-deployments/">deployment notifications</a>. To disable deployment notifications, ignore this option. To enable deployment notifications, set this to <code>true</code>, or to an object containing any of the fields below. Your deploy's <code>revision</code> will be set to the same value as for your sourcemaps (see above). 

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
Set `output.sourcemap` to `true` or `'hidden'`. Add the honeybadger plugin to the plugins array.
```javascript
import honeybadgerRollupPlugin from '@honeybadger-io/rollup-plugin'

// See plugin params above
const hbPluginOptions = {
  apiKey: 'your_key_here', 
  assetsUrl: 'https://yoursite.foo'
}

export default {
  input: 'src/index.js', 
  output: { 
    dir: 'dist', 
    sourcemap: true // Must be true or 'hidden'
  }, 
  plugins: [ honeybadgerRollupPlugin(hbPluginOptions) ],
}
```

### Using Vite: vite.config.js
If you're using Vite, you'll set up `vite.config.js` instead of `rollup.config.js`. 

Set `build.sourcemap` to `true` or `'hidden'`. Add the honeybadger 
plugin to `rollupOptions.plugins`. 

**Note:** Be careful not to add it to the top-level vite plugins without additional config, or it will upload sourcemaps on `serve` rather than just on `build`. 

```javascript
import honeybadgerRollupPlugin from '@honeybadger-io/rollup-plugin'
import { defineConfig } from 'vite'

// See plugin params above
const hbPluginOptions = {
  apiKey: 'your_key_here', 
  assetsUrl: 'https://yoursite.foo'
}

export default defineConfig({
  plugins: [], // Not here
  build: {
    sourcemap: true, // Must be true or 'hidden'
    rollupOptions: {
      plugins: [ honeybadgerRollupPlugin(hbPluginOptions) ]
    }
  }
})
```

## Development

1. Run `npm install`
2. Run the tests with `npm test`
3. Build with `npm run build`

See the `/examples` folder for projects to test against. 

## License

This package is MIT licensed. See the [MIT-LICENSE](./MIT-LICENSE) file in this folder for details.

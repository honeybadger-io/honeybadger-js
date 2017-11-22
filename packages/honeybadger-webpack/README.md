# Honeybadger's Webpack Source Map Plugin

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
  <dt><code>api_key</code> (required)</dt>
  <dd>The API key of your Honeybadger project</dd>

  <dt><code>assets_url</code> (required)</dt>
  <dd>The base URL to production assets (scheme://host/path)<code>*</code><a href="https://docs.honeybadger.io/guides/source-maps.html#wildcards">wildcards</a> are supported. The plugin combines <code>assets_url</code> with the generated minified js file name to build the API parameter <code>minified_url</code></dd>

  <dt><code>revision</code> (optional &mdash; default: "master")</dt>
  <dd>The deploy revision (i.e. commit sha) that your source map applies to. This could also be a code version. For best results, set it to something unique every time your code changes. The <code>revision</code> option must also be configured in <a href="https://github.com/honeybadger-io/honeybadger-js#advanced-configuration">honeybadger.js</a>.</dd>

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
    api_key: 'abc123',
    assets_url: ASSETS_URL,
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

environment.plugins.set(
  'HoneybadgerSourceMap',
  new HoneybadgerSourceMapPlugin({
    api_key: process.env.HONEYBADGER_API_KEY,
    assets_url: process.env.ASSETS_URL,
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

### Development

Install the required npm packages with `npm install`.  Write code. Run tests `npm test`. Repeat.

After that you can

The Honeybadger's Webpack Source Map Plugin is MIT licensed. See the
[MIT-LICENSE](https://raw.github.com/honeybadger-io/honeybadger-webpack/master/MIT-LICENSE)
file in this repository for details.

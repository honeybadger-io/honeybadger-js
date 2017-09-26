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

## Example webpack.config.js

```javascript
const HoneybadgerSourceMapPlugin = require('@honeybadger-io/webpack')
const ASSETS_URL = 'https://cdn.example.com/assets';
const webpackConfig = {
  plugins: [new HoneybadgerSourceMapPlugin({
    api_key: 'abc123',
    revision: 'master',
    assets_url: ASSETS_URL
  })]
}
```

## Configuration

words

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

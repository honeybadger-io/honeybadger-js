const path = require('path')
const HoneybadgerSourceMapPlugin = require('@honeybadger-io/webpack')
const { EnvironmentPlugin } = require('webpack')

module.exports = {
  // Entry here would normally just be the `index.js` file, however
  // adding multiple entry points generates multiple output files,
  // allowing us to test multiple source map uploads
  entry: {
    index: './src/index.js',
    hb: './src/hb.js',
  },
  mode: 'production',
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  devtool: 'source-map',
  plugins: [
    new HoneybadgerSourceMapPlugin({
      apiKey: process.env.HONEYBADGER_API_KEY,
      // assetsUrl would normally be a url where your assets are hosted
      // This is just to test locally, so it's a folder path instead
      assetsUrl: '*/dist',
      revision: process.env.HONEYBADGER_REVISION,
      deploy: {
        environment: 'test', 
        localUsername: 'hbTestUser',
      }
    }), 
    // Be aware that if you use EnvironmentPlugin, the values of those env variables
    // get bundled into your code as strings. 
    new EnvironmentPlugin(['HONEYBADGER_API_KEY', 'HONEYBADGER_REVISION'])
  ]
};
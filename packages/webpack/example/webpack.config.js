const path = require('path');
const HoneybadgerSourceMapPlugin = require('@honeybadger-io/webpack')

module.exports = {
  // Entry here would just needs to be the `index.js` file, however
  // adding multiple entry points allows us to test multiple source map
  // uploads
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
  plugins: [new HoneybadgerSourceMapPlugin({
    apiKey: process.env.HONEYBADGER_API_KEY,
    assetsUrl: 'https://cdn.example.com/assets',
    revision: 'capybara',
    deploy: {
      environment: 'test', 
      localUsername: 'hbTestUser',
    }
  })]
};
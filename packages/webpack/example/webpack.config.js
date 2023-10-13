const path = require('path');
const HoneybadgerSourceMapPlugin = require('@honeybadger-io/webpack')

module.exports = {
  entry: './src/index.js',
  mode: 'production',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
  },
  devtool: 'source-map',
  plugins: [new HoneybadgerSourceMapPlugin({
    apiKey: process.env.HONEYBADGER_API_KEY,
    assetsUrl: 'https://cdn.example.com/assets',
    revision: 'main',
    deploy: true
  })]
};
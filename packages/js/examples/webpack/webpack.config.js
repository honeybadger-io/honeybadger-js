const path = require('path');

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  entry: './main.js',
  output: {
    path: path.join(__dirname, '.'),
    filename: 'bundle.js',
    sourceMapFilename: 'bundle.js.map',
  }
};

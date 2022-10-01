const HoneybadgerSourceMapPlugin = require('@honeybadger-io/webpack')

exports.onCreateWebpackConfig = ({ actions}, { apiKey, revision, assetsUrl }) => {
   actions.setWebpackConfig({
     plugins: [
      new HoneybadgerSourceMapPlugin({
        apiKey,
        revision,
        assetsUrl
      })
     ]
   })
 }

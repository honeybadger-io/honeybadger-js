# Webpack Source Map Plugin Example

Webpack project based [Webpack's example project](https://webpack.js.org/guides/getting-started/). 

Note that currently this project is just used to test the upload of sourcemaps and deploy notifications -- the sourcemaps are not expected to be correctly applied to errors from this project since we didn't set up the revision and assetsUrl. 

## Setup
Two environment variables are required:
1. `HONEYBADGER_API_KEY`: Your project's API key
2. `HONEYBADGER_REVISION`: A unique string. This needs to match between your Honeybadger.configure() and the sourcemap plugin for sourcemaps to be applied. 

You can manage environment variables with [direnv](https://direnv.net/) or however you like. 

## Testing
Run `npm run build` to run webpack. You should see a sourcemap and a deploy notification uploaded to Honeybadger.
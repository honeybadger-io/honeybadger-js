import honeybadgerRollupPlugin from '@honeybadger-io/rollup-plugin'
// Put your API_KEY etc in a .env file, see .env.example 
import * as dotenv from 'dotenv' 
dotenv.config({ path: `.env.local` })

const hbPluginOptions = {
  apiKey: process.env.HONEYBADGER_API_KEY, 
  assetsUrl: process.env.HONEYBADGER_ASSETS_URL, 
  deploy: {
    repository: 'https://github.com/honeybadger-io/honeybadger-js', 
    localUsername: 'BethanyBerkowitz', 
    environment: 'production'
  }, 
  workerCount: 2
}

export default {
  input: 'src/index.js',
  output: {
    dir: 'dist',
    format: 'cjs', 
    sourcemap: 'hidden', 
    // This keeps the file structure intact
    // Normally wouldn't do this, but useful for testing what the bundle
    // looks like when there are multiple js files and subfolders
    preserveModules: true
  }, 
  plugins: [ honeybadgerRollupPlugin(hbPluginOptions) ], 
};
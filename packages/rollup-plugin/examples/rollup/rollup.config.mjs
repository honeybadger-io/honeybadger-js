// Using the local built version of our plugin to test
import honeybadgerRollupPlugin from "../../dist/index.js";
// Put your API_KEY etc in a .env file, see .env.example 
import * as dotenv from 'dotenv' 
dotenv.config()

const hbPluginOptions = {
  apiKey: process.env.HONEYBADGER_API_KEY, 
  assetsUrl: process.env.HONEYBADGER_ASSETS_URL
}

export default {
  input: 'src/index.js',
  output: {
    dir: 'dist',
    format: 'cjs', 
    sourcemap: true, 
    // This keeps the file structure intact
    // Normally wouldn't do this, but useful for testing what the bundle
    // looks like when there are multiple js files and subfolders
    preserveModules: true
  }, 
  plugins: [ honeybadgerRollupPlugin(hbPluginOptions) ], 
};
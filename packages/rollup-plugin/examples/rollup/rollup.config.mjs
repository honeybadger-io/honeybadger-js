// Using the built version of our plugin to test
import honeybadgerRollupPlugin from "../../dist/index.js";

export default {
  input: 'src/index.js',
  output: {
    dir: 'dist',
    format: 'cjs', 
    sourcemap: true
  }, 
  plugins: [honeybadgerRollupPlugin()]
};
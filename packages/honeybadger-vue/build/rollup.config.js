import buble from 'rollup-plugin-buble'; // Transpile/polyfill with reasonable browser support
import vue from 'rollup-plugin-vue'; // Handle .vue SFC files
import {terser} from 'rollup-plugin-terser'
import conditional from "rollup-plugin-conditional";

const isTerse = process.env.minify === true;

export default {
  input: 'src/index.js', // Path relative to package.json
  external: [ '$honeybadger-js' ],
  output: {
    name: 'HoneybadgerVue',
    exports: 'named',
  },
  plugins: [
    vue({
      css: true, // Dynamically inject css as a <style> tag
      compileTemplate: true, // Explicitly convert template to render function
    }),
    buble(), // Transpile to ES5
    conditional(isTerse, terser())
  ],
};

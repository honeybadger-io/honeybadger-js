import buble from 'rollup-plugin-buble' // Transpile/polyfill with reasonable browser support
import vue from 'rollup-plugin-vue' // Handle .vue SFC files
import { terser } from 'rollup-plugin-terser'
import conditional from 'rollup-plugin-conditional'
import replace from '@rollup/plugin-replace'
import path from 'path'
import pkg from './package.json'

const isTerse = process.env.MINIFY === 'true'

export default {
  input: 'src/index.js', // Path relative to package.json
  output: {
    name: 'HoneybadgerVue',
    exports: 'named',
    globals: { '@honeybadger-io/js': 'Honeybadger' },
    sourcemap: true,
    sourcemapPathTransform: relativePath => {
      // will transform e.g. "src/main.js" -> "main.js"
      return path.relative('src', relativePath)
    },
  },
  external: [
    '@honeybadger-io/js'
  ],
  plugins: [
    replace({
      preventAssignment: false,
      exclude: 'node_modules/**',
      __VERSION__: pkg.version
    }),
    vue(),
    buble(), // Transpile to ES5
    conditional(isTerse, [terser()])
  ],
}

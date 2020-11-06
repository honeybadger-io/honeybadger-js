import typescript from '@rollup/plugin-typescript'
import replace from '@rollup/plugin-replace'
import resolve from '@rollup/plugin-node-resolve'
import { uglify } from 'rollup-plugin-uglify'
import pkg from './package.json'

// These plugins are used for all builds
const sharedPlugins = [
  replace({
    exclude: 'node_modules/**',
    __VERSION__: pkg.version
  }),
  resolve()
]

// These plugins are used for UMD builds
const umdPlugins = [
  ...sharedPlugins,
  typescript()
]

// These plugins are used for Node builds
const nodePlugins = [
  ...sharedPlugins,
  typescript()
]

export default [
  // Browser build
  {
    input: 'src/browser.ts',
    output: {
      name: 'Honeybadger',
      file: pkg.browser,
      format: 'umd',
      sourcemap: true
    },
    plugins: umdPlugins
  },

  // Browser build (minified)
  {
    input: 'src/browser.ts',
    output: {
      name: 'Honeybadger',
      file: 'dist/browser/honeybadger.min.js',
      format: 'umd',
      sourcemap: true
    },
    plugins: [...umdPlugins, uglify()]
  },

  // Server build
  {
    input: 'src/server.ts',
    external: ['https'],
    output: {
      file: pkg.main,
      format: 'cjs'
    },
    plugins: nodePlugins
  }
]

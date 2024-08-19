import replace from '@rollup/plugin-replace'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import { terser } from 'rollup-plugin-terser'
import stripCode from 'rollup-plugin-strip-code'
import pkg from './package.json'

const sharedPlugins = [
  replace({
    preventAssignment: false,
    exclude: 'node_modules/**',
    __VERSION__: pkg.version
  }),
  commonjs({
    ignoreDynamicRequires: true,
  }),
  resolve({
    preferBuiltins: true // Plugin node-resolve: preferring built-in module 'buffer' over local alternative
  })
]

export default [
  // Browser build
  {
    input: 'build/src/browser.js',
    output: {
      name: 'Honeybadger',
      file: pkg.browser,
      format: 'umd',
      sourcemap: true
    },
    plugins: sharedPlugins
  },

  // Browser build (minified)
  {
    input: 'build/src/browser.js',
    output: {
      name: 'Honeybadger',
      file: 'dist/browser/honeybadger.min.js',
      format: 'umd',
      sourcemap: true
    },
    plugins: [...sharedPlugins, terser()]
  },

  // Chrome Extension build (minified) - https://github.com/honeybadger-io/honeybadger-js/issues/1383
  {
    input: 'build/src/browser.js',
    output: {
      name: 'Honeybadger',
      file: 'dist/browser/honeybadger.ext.min.js',
      format: 'umd',
      sourcemap: true
    },
    plugins: [
      stripCode({
        start_comment: 'ROLLUP_STRIP_CODE_CHROME_EXTENSION_START',
        end_comment: 'ROLLUP_STRIP_CODE_CHROME_EXTENSION_END'
      }),
      ...sharedPlugins,
      terser()
    ]
  },

  // Server build
  {
    input: 'build/src/server.js',
    external: [
      'http',
      'https',
      'url',
      'os',
      'fs',
      'util',
      'domain',
      'async_hooks',
    ],
    output: {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true
    },
    plugins: sharedPlugins
  }
]

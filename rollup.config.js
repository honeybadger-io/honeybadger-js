import typescript from '@rollup/plugin-typescript'
import replace from '@rollup/plugin-replace'
import resolve from '@rollup/plugin-node-resolve'
import { uglify } from 'rollup-plugin-uglify'
import pkg from './package.json'

// These plugins are used for all builds
const sharedPlugins = [
  replace({
    preventAssignment: false,
    exclude: 'node_modules/**',
    __VERSION__: pkg.version
  }),
  resolve()
]

// These plugins are used for UMD builds
const browserPlugins = [
  ...sharedPlugins,
  typescript({
    tsconfig: './tsconfig.json',
    exclude: [
      './src/server.ts',
      './src/server/**'
    ]
  })
]

// These plugins are used for Node builds
const nodePlugins = [
  ...sharedPlugins,
  typescript({
    tsconfig: './tsconfig.json',
    exclude: [
      './src/browser.ts',
      './src/browser/**'
    ]
  })
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
    plugins: browserPlugins
  },

  // ESM build
  {
    input: 'src/browser.ts',
    output: {
      name: 'Honeybadger',
      file: pkg.esm,
      format: 'es'
    },
    plugins: browserPlugins
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
    plugins: [...browserPlugins, uglify()]
  },

  // Server build
  {
    input: 'src/server.ts',
    external: ['http', 'https', 'url'],
    output: {
      file: pkg.main,
      format: 'cjs'
    },
    plugins: nodePlugins
  }
]

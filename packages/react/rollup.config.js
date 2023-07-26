import commonjs from '@rollup/plugin-commonjs'
import replace from '@rollup/plugin-replace'
import path from 'path'

import pkg from './package.json'

export default {
  input: 'build/index.js',
  output: [
    {
      file: pkg.main,
      exports: 'named',
      format: 'cjs',
      sourcemap: true,
      sourcemapPathTransform: relativePath => {
        // will transform e.g. "src/main.js" -> "main.js"
        return path.relative('src', relativePath)
      },
    },
    {
      file: pkg.module,
      format: 'es',
      exports: 'named',
      sourcemap: true,
      sourcemapPathTransform: relativePath => {
        // will transform e.g. "src/main.js" -> "main.js"
        return path.relative('src', relativePath)
      }
    },
    {
      file: pkg.unpkg,
      format: 'iife',
      exports: 'named',
      name: 'HoneybadgerReact',
      sourcemap: true,
      sourcemapPathTransform: relativePath => {
        return path.relative('src', relativePath)
      },
      globals: {
        'react': 'React',
        'prop-types': 'PropTypes',
        '@honeybadger-io/js': 'Honeybadger',
        'react/jsx-runtime': 'jsxRuntime'
      }
    }
  ],
  external: [
    'react',
    'prop-types',
    'react/jsx-runtime',
    '@honeybadger-io/js'
  ],
  plugins: [
    replace({
      preventAssignment: false,
      exclude: 'node_modules/**',
      __VERSION__: pkg.version
    }),
    commonjs()
  ]
}

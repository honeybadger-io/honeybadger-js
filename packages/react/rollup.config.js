import rollupTs from '@rollup/plugin-typescript'
import typescript from 'typescript'
import commonjs from '@rollup/plugin-commonjs'
import path from 'path'

import pkg from './package.json'

export default {
  input: 'src/index.tsx',
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
    rollupTs({
      typescript,
      declaration: true,
      declarationDir: './dist'
    }),
    commonjs()
  ]
}

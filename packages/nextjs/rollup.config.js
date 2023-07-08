import commonjs from '@rollup/plugin-commonjs'
import copy from 'rollup-plugin-copy'
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
  ],
  external: [
    'fs',
    'path',
    'next',
  ],
  plugins: [
    commonjs(),
    copy({
      targets: [
        { src: 'build/copy-config-files.js*', dest: 'dist' },
      ]
    })
  ]
}

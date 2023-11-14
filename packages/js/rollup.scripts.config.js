import commonjs from '@rollup/plugin-commonjs'
import executable from 'rollup-plugin-executable'
import resolve from '@rollup/plugin-node-resolve'
import path from 'path'

export default {
  input: 'build/src/server/checkins-sync-exec.js',
  output: [
    {
      file: 'dist/server/checkins-sync-exec.js',
      banner: '#!/usr/bin/env node', // rollup throws an error if this line is already in the js file
      exports: 'named',
      format: 'cjs',
      sourcemap: true,
      inlineDynamicImports: true,
      sourcemapPathTransform: relativePath => {
        // will transform e.g. "src/main.js" -> "main.js"
        return path.relative('src', relativePath)
      },
    },
  ],
  external: [
    'fs',
    'path',
    'os',
    'url',
    'util',
    'http',
    'https',
    'cosmiconfig',
    '@honeybadger-io/core'
  ],
  plugins: [
    commonjs(),
    resolve({
      preferBuiltins: true, // Plugin node-resolve: preferring built-in module 'buffer' over local alternative
    }),
    executable(),
  ]
}

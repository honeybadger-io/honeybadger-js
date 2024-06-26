import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import path from 'path'

export default {
  input: 'build/src/server/check-ins-sync.js',
  output: [
    {
      file: 'dist/server/check-ins-sync.js',
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
    '@honeybadger-io/core'
  ],
  plugins: [
    commonjs({
      ignoreDynamicRequires: true,
    }),
    resolve({
      preferBuiltins: true, // Plugin node-resolve: preferring built-in module 'buffer' over local alternative
    }),
  ]
}

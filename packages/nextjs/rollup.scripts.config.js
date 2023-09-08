import commonjs from '@rollup/plugin-commonjs'
import executable from 'rollup-plugin-executable'
import path from 'path'

export default {
  input: 'build/copy-config-files-exec.js',
  output: [
    {
      file: 'dist/copy-config-files-exec.js',
      banner: '#!/usr/bin/env node', // rollup throws an error if this line is already in the js file
      exports: 'named',
      format: 'cjs',
      sourcemap: true,
      sourcemapPathTransform: relativePath => {
        // will transform e.g. "src/main.js" -> "main.js"
        return path.relative('src', relativePath)
      },
    },
  ],
  external: [
    'fs',
    'path',
  ],
  plugins: [
    commonjs(),
    executable(),
  ]
}

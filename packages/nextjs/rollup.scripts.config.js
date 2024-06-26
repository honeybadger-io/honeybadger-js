import commonjs from '@rollup/plugin-commonjs'
import path from 'path'

export default {
  input: 'build/copy-config-files.js',
  output: [
    {
      file: 'dist/copy-config-files.js',
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
  ]
}

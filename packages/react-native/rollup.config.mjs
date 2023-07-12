import json from '@rollup/plugin-json'
import replace from '@rollup/plugin-replace'
import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'
import fs from 'fs'

// ExperimentalWarning: Importing JSON modules is an experimental feature.
// import pkg from './package.json' assert { type: 'json' }
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'))

export default [
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist',
      format: 'cjs',
      sourcemap: true,
    },
    plugins: [
      replace({
        preventAssignment: false,
        exclude: 'node_modules/**',
        __VERSION__: pkg.version
      }),
      typescript(),
      json(),
    ],
    external: ['react-native', '@honeybadger-io/core'],
  },
  {
    input: 'src/index.ts',
    output: { file: 'dist/index.d.ts' },
    plugins: [dts()],
  },
]

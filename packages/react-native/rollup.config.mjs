import json from '@rollup/plugin-json'
import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'

export default [
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist', 
      format: 'cjs',
      exports: 'named',
      sourcemap: true,
    },
    plugins: [ 
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

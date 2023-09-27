import typescript from '@rollup/plugin-typescript'
import { dts } from 'rollup-plugin-dts'
import del from "rollup-plugin-delete"

export default [
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist', 
      format: 'cjs',
      sourcemap: true,
    },
    plugins: [ 
      typescript(),
    ], 
    external: [ 'node-fetch', 'form-data', 'fs', 'fetch-retry' ]
  }, 
  {
    input: 'dist/dts/index.d.ts',
    output: { file: 'dist/index.d.ts' },
    plugins: [ 
      dts(), 
      del({ hook: "buildEnd", targets: "./dist/dts" })
    ],
  },
]
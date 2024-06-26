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
      // we have to delete tsconfig.tsbuildinfo file, because it acts as a cache file
      // and it will not regenerate the input file.
      // if we don't remove it and run rollup, the first run will be successful
      // but any subsequent ones will fail because tsconfig.tsbuildinfo file exists
      // and thinks that dist/dts/index.d.ts also exists.
      del({ hook: "buildEnd", targets: ["./dist/dts", "tsconfig.tsbuildinfo"] })
    ],
  },
]

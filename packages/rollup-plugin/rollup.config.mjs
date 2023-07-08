import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json'
import typescript from '@rollup/plugin-typescript'

const sharedPlugins = [
  nodeResolve({ preferBuiltins: true }), 
  commonjs(), 
  json(),
]

export default [
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist/cjs', 
      format: 'cjs',
      sourcemap: true,
    },
    plugins: [ 
      ...sharedPlugins,
      typescript({ declarationDir: 'dist/cjs' }),
    ]
  }, 
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist/es', 
      format: 'es', 
      sourcemap: true,
    },
    plugins: [ 
      ...sharedPlugins,
      typescript({ declarationDir: 'dist/es' }),
    ]
  }
]
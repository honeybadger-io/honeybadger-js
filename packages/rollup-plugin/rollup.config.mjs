import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/index.js',
  output: [ 
    {
      dir: 'dist/cjs', 
      format: 'cjs', 
    }, 
    { 
      dir: 'dist/es', 
      format: 'es', 
    },
  ],
  plugins: [ nodeResolve({ preferBuiltins: true }), commonjs() ]
};
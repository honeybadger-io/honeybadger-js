import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import replace from 'rollup-plugin-replace';
import { uglify } from 'rollup-plugin-uglify';
import pkg from './package.json';

// These plugins are used for all builds
const sharedPlugins = [
  replace({
    exclude: 'node_modules/**',
    __VERSION__: pkg.version,
  }),
];

// These plugins are used for UMD builds
const umdPlugins = [
  resolve(),
  commonjs(),
  babel({
    exclude: 'node_modules/**',
  }),
  ...sharedPlugins,
];

export default [
  // browser-friendly UMD build
  {
    input: 'src/main.js',
    output: {
      name: 'honeybadger',
      file: pkg.browser,
      format: 'umd',
      sourcemap: true,
    },
    plugins: umdPlugins,
  },
  // minified build
  {
    input: 'src/main.js',
    output: {
      name: 'honeybadger',
      file: 'dist/honeybadger.min.js',
      format: 'umd',
      sourcemap: true,
    },
    plugins: [...umdPlugins, uglify()],
  },

  // CommonJS (for Node) and ES module (for bundlers) build.
  // (We could have three entries in the configuration array
  // instead of two, but it's quicker to generate multiple
  // builds from a single configuration where possible, using
  // an array for the `output` option, where we can specify
  // `file` and `format` for each target)
  {
    input: 'src/main.js',
    external: ['ms'],
    output: [
      { file: pkg.main, format: 'cjs' },
      { file: pkg.module, format: 'es' },
    ],
    plugins: [...sharedPlugins]
  },
];

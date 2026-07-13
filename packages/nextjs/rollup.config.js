import commonjs from '@rollup/plugin-commonjs'
import copy from 'rollup-plugin-copy'
import path from 'path'

const sourcemapPathTransform = relativePath => {
  // will transform e.g. "src/main.js" -> "main.js"
  return path.relative('src', relativePath)
}

// Main bundle: full public surface, including the Node-only webpack plugin
// (requires `fs`/`path`). Consumed by tools that don't understand the
// `edge-light` exports condition.
const mainConfig = {
  input: 'build/index.js',
  output: [
    {
      file: 'dist/honeybadger-nextjs.cjs.js',
      exports: 'named',
      format: 'cjs',
      sourcemap: true,
      sourcemapPathTransform,
    },
    {
      file: 'dist/honeybadger-nextjs.esm.js',
      format: 'es',
      exports: 'named',
      sourcemap: true,
      sourcemapPathTransform,
    },
  ],
  external: [
    'fs',
    'path',
    'next',
  ],
  plugins: [
    commonjs(),
    copy({
      targets: [
        { src: 'build/*.d.ts', dest: 'dist' },
      ]
    })
  ]
}

// Edge bundle: `withHoneybadger` only, no `fs`/`path`. Selected automatically
// by bundlers (e.g. Next.js) that recognize the `edge-light` exports
// condition, so edge routes/middleware never pull in the Node-only webpack
// plugin.
const edgeConfig = {
  input: 'build/edge.js',
  output: [
    {
      file: 'dist/honeybadger-nextjs-edge.cjs.js',
      exports: 'named',
      format: 'cjs',
      sourcemap: true,
      sourcemapPathTransform,
    },
    {
      file: 'dist/honeybadger-nextjs-edge.esm.js',
      format: 'es',
      exports: 'named',
      sourcemap: true,
      sourcemapPathTransform,
    },
  ],
  external: [
    'next',
  ],
  plugins: [
    commonjs(),
  ]
}

export default [mainConfig, edgeConfig]

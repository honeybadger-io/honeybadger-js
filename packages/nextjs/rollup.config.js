import commonjs from '@rollup/plugin-commonjs'
import copy from 'rollup-plugin-copy'
import path from 'path'

const sourcemapPathTransform = relativePath => {
  // will transform e.g. "src/main.js" -> "main.js"
  return path.relative('src', relativePath)
}

// Main bundle: full public surface. Consumed by next.config and the server runtime, and
// by tools that don't understand the `edge-light` or `browser` exports conditions.
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
    'next',
    'next/server',
    '@honeybadger-io/js',
    '@honeybadger-io/react',
    '@vercel/otel',
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

// Edge bundle: the runtime hooks only, no `fs`/`path`. Selected automatically by
// bundlers (e.g. Next.js) that recognize the `edge-light` exports condition.
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
    'next/server',
    '@honeybadger-io/js',
    '@honeybadger-io/react',
    '@vercel/otel',
  ],
  plugins: [
    commonjs(),
  ]
}

// Browser bundle: what `instrumentation-client` imports, and nothing else. Selected via
// the `browser` exports condition so a client build does not pull in the server hooks —
// `flush` imports `next/server` at the top level, which would ship dead server code to
// every visitor.
const clientConfig = {
  input: 'build/client.js',
  output: [
    {
      file: 'dist/honeybadger-nextjs-client.cjs.js',
      exports: 'named',
      format: 'cjs',
      sourcemap: true,
      sourcemapPathTransform,
    },
    {
      file: 'dist/honeybadger-nextjs-client.esm.js',
      format: 'es',
      exports: 'named',
      sourcemap: true,
      sourcemapPathTransform,
    },
  ],
  external: [
    '@honeybadger-io/react',
  ],
  plugins: [
    commonjs(),
  ]
}

export default [mainConfig, edgeConfig, clientConfig]

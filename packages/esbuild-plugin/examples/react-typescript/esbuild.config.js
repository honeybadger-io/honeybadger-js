const esbuild = require('esbuild')
const { honeybadgerSourceMapPlugin } = require('../../dist/index.js')

const hbOptions = {
  apiKey: process.env.HONEYBADGER_API_KEY,
  assetsUrl: process.env.HONEYBADGER_ASSETS_URL,
  revision: process.env.HONEYBADGER_REVISION,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
}

esbuild
  .build({
    entryPoints: ['src/index.tsx'],
    bundle: true,
    minify: true,
    format: 'cjs',
    sourcemap: true,
    outfile: 'dist/output.js',
    loader: { '.js': 'jsx', '.tsx': 'jsx' },
    plugins: [honeybadgerSourceMapPlugin(hbOptions)]
  // external: ['react', 'react-dom'],
  })
  .then(() => {
    console.log('Build complete')
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  });

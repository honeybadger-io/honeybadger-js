const esbuild = require('esbuild')
const { honeybadgerSourceMapPlugin } = require('../../dist/index.js')

const hbOptions = {
  apiKey: process.env.HONEYBADGER_API_KEY,
  assetsUrl: 'https://example.com/public',
  revision: 'esbuild-plugin-react-typescript-example',
}

esbuild
  .build({
    entryPoints: ['src/app.tsx'],
    bundle: true,
    minify: true,
    format: 'cjs',
    sourcemap: true,
    outfile: 'dist/output.js',
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

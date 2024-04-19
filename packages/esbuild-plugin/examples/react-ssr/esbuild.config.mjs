import * as esbuild from 'esbuild'
import { honeybadgerSourceMapPlugin } from '../../dist/index.js'

const hbOptions = {
    apiKey: process.env.HONEYBADGER_API_KEY,
    assetsUrl: 'https://example.com/public',
    revision: 'esbuild-plugin-react-ssr-example',
}

await esbuild.build({
    entryPoints: ['src/app.jsx'],
    bundle: true,
    minify: true,
    sourcemap: true,
    target: ['chrome58', 'firefox57', 'safari11', 'edge16'],
    outfile: 'dist/out.js',
    plugins: [honeybadgerSourceMapPlugin(hbOptions)]
})

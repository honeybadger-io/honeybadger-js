import * as esbuild from 'esbuild'
import * as fs from 'fs'
import { basename, dirname, join } from 'path'
import { uploadSourcemaps, cleanOptions } from '@honeybadger-io/plugin-core'

const hbOptions = cleanOptions({
    apiKey: process.env.HONEYBADGER_API_KEY,
    assetsUrl: 'https://example.com/public',
    revision: 'esbuild-plugin-example',
})

console.log(hbOptions)

const hbPlugin = {
    name: 'hb',
    setup(build) {
        build.initialOptions.write = false
        build.onEnd(async (result) => {
            const folderTasks = []
            const tasks = []
            for (const { path, contents } of result.outputFiles) {
                folderTasks.push(fs.promises.mkdir(dirname(path), { recursive: true }))
            }

            await Promise.all(folderTasks)

            for (const { path, contents } of result.outputFiles) {
                tasks.push(fs.promises.writeFile(path, contents))
            }

            await Promise.all(tasks)

            const assets = getAssets(result.outputFiles)
            console.log(assets)
            await uploadSourcemaps(assets, hbOptions)
        })
    }
}

function getAssets(outputFiles) {
    const assets= []
    for (const file of outputFiles) {
        if (!file.path.endsWith('.map')) {
            continue
        }

        const sourcemapFilename = basename(file.path)
        const sourcemapFilePath = dirname(file.path)
        const jsFilename = sourcemapFilename.replace('.map', '')
        const sourceMapInfo = {
            sourcemapFilename,
            sourcemapFilePath: join(sourcemapFilePath, sourcemapFilename),
            jsFilename,
            jsFilePath: join(sourcemapFilePath, jsFilename)
        }

        assets.push(sourceMapInfo)
    }
    return assets
}

await esbuild.build({
    entryPoints: ['src/app.jsx'],
    bundle: true,
    minify: true,
    sourcemap: true,
    target: ['chrome58', 'firefox57', 'safari11', 'edge16'],
    outfile: 'dist/out.js',
    plugins: [hbPlugin]
})

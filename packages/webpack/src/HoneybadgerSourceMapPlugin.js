import { join } from 'path'
import { handleError } from './helpers'
import { cleanOptions, sendDeployNotification, uploadSourcemaps } from '@honeybadger-io/plugin-core'

const PLUGIN_NAME = 'HoneybadgerSourceMapPlugin'

/**
 * @typedef {Object} DeployObject
 * @property {?string} environment - production, development, staging, etc
 * @property {?string} repository - URL for repository IE: https://github.com/foo/bar
 * @property {?string} localUsername - The name of the user deploying. IE: Jane
 */

class HoneybadgerSourceMapPlugin {
  constructor (options) {
    this.cleanOptions = cleanOptions
    this.sendDeployNotification = sendDeployNotification
    this.uploadSourceMaps = uploadSourcemaps
    this.options = cleanOptions(options)
  }

  async afterEmit (compilation) {
    if (this.isDevServerRunning()) {
      if (!this.options.silent) {
        console.info('\nHoneybadgerSourceMapPlugin will not upload source maps because webpack-dev-server is running.')
      }
      return
    }

    try {
      await this.uploadSourceMaps(this.getAssets(compilation))
      if (this.options.deploy) {
        await this.sendDeployNotification(this.options)
      }
    } catch (err) {
      if (!this.options.ignoreErrors) {
        compilation.errors.push(...handleError(err))
      } else if (!this.options.silent) {
        compilation.warnings.push(...handleError(err))
      }
    }
  }

  isDevServerRunning () {
    return process.env.WEBPACK_DEV_SERVER === 'true'
  }

  apply (compiler) {
    compiler.hooks.afterEmit.tapPromise(PLUGIN_NAME, this.afterEmit.bind(this))
  }

  // eslint-disable-next-line class-methods-use-this
  getAssetPath (compilation, name) {
    if (!name) { return '' }
    return join(
      compilation.getPath(compilation.compiler.outputPath),
      name.split('?')[0]
    )
  }

  // getSource (compilation, name) {
  //   const path = this.getAssetPath(compilation, name)
  //   return fs.readFile(path, { encoding: 'utf-8' })
  // }

  getAssets(compilation) {
    const { chunks } = compilation.getStats().toJson()
    return chunks
      .map(({ files, auxiliaryFiles }) => {
        const sourcemapFilename = files.find(file => /\.js$/.test(file))
        const sourcemapFilePath = this.getAssetPath(compilation, sourcemapFilename)
        // Webpack 4 using chunk.files, Webpack 5 uses chunk.auxiliaryFiles
        // https://webpack.js.org/blog/2020-10-10-webpack-5-release/#stats
        const jsFilename = (auxiliaryFiles || files).find(file =>
          /\.js\.map$/.test(file)
        )
        const jsFilePath = this.getAssetPath(compilation, jsFilename)
        return { sourcemapFilename, sourcemapFilePath, jsFilename, jsFilePath }
      })
      .filter(({ sourcemapFilename, jsFilename }) => sourcemapFilename && jsFilename)
  }

  // getUrlToAsset (sourceFile) {
  //   if (typeof sourceFile === 'string') {
  //     const sep = '/'
  //     const unsanitized = `${this.options.assetsUrl}${sep}${sourceFile}`
  //     return unsanitized.replace(/([^:]\/)\/+/g, '$1')
  //   }
  //   return this.assetsUrl(sourceFile)
  // }

  // async uploadSourceMap (compilation, { sourceFile, sourceMap }) {
  //   const errorMessage = `failed to upload ${sourceMap} to Honeybadger API`

  //   let sourceMapSource
  //   let sourceFileSource

  //   try {
  //     sourceMapSource = await this.getSource(compilation, sourceMap)
  //     sourceFileSource = await this.getSource(compilation, sourceFile)
  //   } catch (err) {
  //     throw new VError(err, err.message)
  //   }

  //   const form = new FormData()
  //   form.append('api_key', this.options.apiKey)
  //   form.append('minified_url', this.getUrlToAsset(sourceFile))
  //   form.append('minified_file', sourceFileSource, {
  //     filename: sourceFile,
  //     contentType: 'application/javascript'
  //   })
  //   form.append('source_map', sourceMapSource, {
  //     filename: sourceMap,
  //     contentType: 'application/octet-stream'
  //   })
  //   form.append('revision', this.options.revision)

  //   let res
  //   try {
  //     res = await fetch(this.options.endpoint, {
  //       method: 'POST',
  //       body: form,
  //       redirect: 'follow',
  //       retries: this.options.retries,
  //       retryDelay: 1000
  //     })
  //   } catch (err) {
  //     // network / operational errors. Does not include 404 / 500 errors
  //     throw new VError(err, errorMessage)
  //   }

  //   // >= 400 responses
  //   if (!res.ok) {
  //     // Attempt to parse error details from response
  //     let details
  //     try {
  //       const body = await res.json()

  //       if (body && body.error) {
  //         details = body.error
  //       } else {
  //         details = `${res.status} - ${res.statusText}`
  //       }
  //     } catch (parseErr) {
  //       details = `${res.status} - ${res.statusText}`
  //     }

  //     throw new Error(`${errorMessage}: ${details}`)
  //   }

  //   // Success
  //   if (!this.options.silent) {
  //     // eslint-disable-next-line no-console
  //     console.info(`Uploaded ${sourceMap} to Honeybadger API`)
  //   }
  // }

  // uploadSourceMaps (compilation) {
  //   const assets = this.getAssets(compilation)

  //   if (assets.length <= 0) {
  //     // We should probably tell people they're not uploading assets.
  //     // this is also an open issue on Rollbar sourcemap plugin
  //     // https://github.com/thredup/rollbar-sourcemap-webpack-plugin/issues/39
  //     if (!this.options.silent) {
  //       console.info(this.noAssetsFoundMessage)
  //     }

  //     return
  //   }

  //   console.info('\n')

  //   // On large projects source maps should not all be uploaded at the same time,
  //   // but in parallel with a reasonable worker count in order to avoid network issues
  //   return resolvePromiseWithWorkers(
  //     assets.map(asset => () => this.uploadSourceMap(compilation, asset)),
  //     this.options.workerCount
  //   )
  // }

  // get noAssetsFoundMessage () {
  //   return '\nHoneybadger could not find any sourcemaps. Nothing will be uploaded.'
  // }
}

module.exports = HoneybadgerSourceMapPlugin

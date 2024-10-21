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
    this.sendDeployNotification = sendDeployNotification
    this.uploadSourceMaps = uploadSourcemaps
    this.options = cleanOptions(options)
  }

  async afterEmit (compilation) {
    if (this.isDevEnv(this.options.developmentEnvironments)) {
      if (!this.options.silent) {
        console.info('\nHoneybadgerSourceMapPlugin will not upload source maps because webpack-dev-server is running.')
      }
      return
    }

    try {
      const assets = this.getAssets(compilation)
      await this.uploadSourceMaps(assets, this.options)
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

  isDevEnv (devEnvironments) {
    if (process.env.WEBPACK_DEV_SERVER === 'true') {
      return true
    }

    return !!(devEnvironments && devEnvironments.includes(process.env.NODE_ENV));
  }

  apply (compiler) {
    compiler.hooks.afterEmit.tapPromise(PLUGIN_NAME, this.afterEmit.bind(this))
  }

  getAssetPath (compilation, name) {
    if (!name) { return '' }
    return join(
      compilation.getPath(compilation.compiler.outputPath),
      name.split('?')[0]
    )
  }

  getAssets(compilation) {
    const { chunks } = compilation.getStats().toJson()
    return chunks
      .map(({ files, auxiliaryFiles }) => {
        const jsFilename = files.find(file => /\.js$/.test(file))
        const jsFilePath = this.getAssetPath(compilation, jsFilename)
        // Webpack 4 using chunk.files, Webpack 5 uses chunk.auxiliaryFiles
        // https://webpack.js.org/blog/2020-10-10-webpack-5-release/#stats
        const sourcemapFilename = (auxiliaryFiles || files).find(file =>
          /\.js\.map$/.test(file)
        )
        const sourcemapFilePath = this.getAssetPath(compilation, sourcemapFilename)
        return { sourcemapFilename, sourcemapFilePath, jsFilename, jsFilePath }
      })
      .filter(({ sourcemapFilename, jsFilename }) => sourcemapFilename && jsFilename)
  }
}

module.exports = HoneybadgerSourceMapPlugin

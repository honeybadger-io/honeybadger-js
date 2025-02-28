import { Util } from '@honeybadger-io/core'
import { cleanOptions, sendDeployNotification, uploadSourcemaps, Types } from '@honeybadger-io/plugin-core'
import type { Message, OutputFile, PluginBuild } from 'esbuild'
import { promises } from 'fs'
import { dirname, basename, join } from 'path'

const writeFile = promises.writeFile
const mkdir = promises.mkdir

const PLUGIN_NAME = 'HoneybadgerSourceMapPlugin'

class HoneybadgerSourceMapPlugin {

  private static idSeed = 0

  private readonly options: Types.HbPluginOptions

  constructor(options: Types.HbPluginUserOptions) {
    this.options = cleanOptions(options)
  }
  setup() {
    const self = this;

    return {
      name: PLUGIN_NAME,
      setup(build: PluginBuild) {
        if (self.isDevEnv(self.options.developmentEnvironments)) {
          return
        }

        // need to set write to false to get the outputFiles
        build.initialOptions.write = false

        build.onEnd(async (result) => {
          try {
            await self.writeOutputFiles(result.outputFiles)

            const assets = self.getAssets(result.outputFiles)

            await uploadSourcemaps(assets, self.options)
            if (self.options.deploy) {
              await sendDeployNotification(self.options)
            }
          } catch (err) {
            const esBuildError = self.handleError(err)
            if (!self.options.ignoreErrors) {
              result.errors.push(esBuildError)
            } else if (!self.options.silent) {
              result.errors.push(esBuildError)
            }
          }
        })
      }
    }
  }

  private async writeOutputFiles(outputFiles: OutputFile[]): Promise<void> {
    const createFolderTasks: Promise<string>[] = []
    const writeFileTasks: Promise<void>[] = []

    for (const file of outputFiles) {
      createFolderTasks.push(mkdir(dirname(file.path), { recursive: true }))
    }

    await Promise.all(createFolderTasks)

    for (const file of outputFiles) {
      writeFileTasks.push(writeFile(file.path, file.contents))
    }

    await Promise.all(writeFileTasks)
  }

  private getAssets(outputFiles: OutputFile[]): Types.SourcemapInfo[] {
    const assets: Types.SourcemapInfo[] = []
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

  private isDevEnv(devEnvironments: string[]): boolean {
    if (!process.env.NODE_ENV || process.env.NODE_ENV === '') {
      return false
    }

    return devEnvironments.includes(process.env.NODE_ENV)
  }

  private handleError(error: Error): Message {
    const stackTrace = Util.makeBacktrace(error.stack)
    const location = {
      file: '',
      namespace: '',
      line: 0,
      column: 0,
      length: 0,
      lineText: '',
      suggestion: ''
    }
    if (stackTrace.length > 0) {
      const frame = stackTrace[0]
      location.file = frame.file
      location.line = frame.number
      location.column = frame.column
    }

    return {
      id: `${PLUGIN_NAME}_${HoneybadgerSourceMapPlugin.idSeed++}`,
      pluginName: PLUGIN_NAME,
      text: error.message,
      location,
      notes: [],
      detail: error
    }
  }
}

export function honeybadgerSourceMapPlugin(options: Types.HbPluginUserOptions) {
  return new HoneybadgerSourceMapPlugin(options).setup()
}

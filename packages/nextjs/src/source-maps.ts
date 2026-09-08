import fs from 'fs'
import path from 'path'
import picomatch from 'picomatch'
// Type-only, so nothing from plugin-core is pulled into the module graph at import time.
import type { Types } from '@honeybadger-io/plugin-core'
import { HoneybadgerNextJsConfig } from './types'

/**
 * Loads plugin-core on demand, never at module scope.
 *
 * Its module body runs `fetchRetry(require('node-fetch'))` as a side effect, which throws
 * `ArgumentError: fetch must be a function` inside the Next.js server runtime. This module
 * shares a barrel with the runtime instrumentation exports, so a top-level import here took
 * down `instrumentation.ts` for every app — the hook failed to load and nothing was
 * instrumented at all. plugin-core is a rollup external, so this stays a real deferred
 * require in both the CJS and ESM bundles.
 */
function loadPluginCore() {
  return import('@honeybadger-io/plugin-core')
}

/**
 * The build output directory Next.js serves over HTTP, relative to `distDir`. `.next/static`
 * is published at `/_next/static`; everything else in `distDir` is not served.
 */
const BROWSER_OUTPUT_DIR = 'static'

/**
 * Metadata Next.js passes to `compiler.runAfterProductionCompile`.
 */
export type AfterProductionCompileMetadata = {
  distDir: string
  projectDir: string
}

function log(type: 'error' | 'warn' | 'debug', silent: boolean, msg: string): void {
  if (['error', 'warn'].includes(type) || !silent) {
    console[type]('[HoneybadgerNextJs]', msg)
  }
}

/**
 * Whether the project has configured source map upload.
 *
 * Separate from `resolveUploadOptions` because `withHoneybadgerConfig` needs the answer
 * while building the config, and must not emit the "not configured" warning there — the
 * hook will do that once, at build time.
 */
export function isSourceMapUploadConfigured(
  honeybadgerNextJsConfig: HoneybadgerNextJsConfig = {}
): boolean {
  if (honeybadgerNextJsConfig.disableSourceMapUpload) {
    return false
  }

  const apiKey = honeybadgerNextJsConfig.apiKey || process.env.NEXT_PUBLIC_HONEYBADGER_API_KEY
  const assetsUrl = honeybadgerNextJsConfig.assetsUrl || process.env.NEXT_PUBLIC_HONEYBADGER_ASSETS_URL

  return Boolean(apiKey && assetsUrl)
}

/**
 * Resolves the upload options, falling back to the same environment variables the
 * configuration templates use.
 *
 * Returns `null` rather than throwing when the project has not configured source map
 * upload. `cleanOptions` throws on a missing `apiKey`/`assetsUrl`, and Next.js re-throws
 * whatever this hook throws — so validating eagerly would fail the build of every app
 * that simply does not use this feature.
 */
export async function resolveUploadOptions(
  honeybadgerNextJsConfig: HoneybadgerNextJsConfig = {}
): Promise<Types.HbPluginOptions | null> {
  const silent = honeybadgerNextJsConfig.silent ?? true

  if (honeybadgerNextJsConfig.disableSourceMapUpload) {
    log('debug', silent, 'source map upload disabled')
    return null
  }

  // `disableSourceMapUpload` is this package's own switch, handled above; everything else
  // on the config is a plugin-core option and passes straight through.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { disableSourceMapUpload, ...provided } = honeybadgerNextJsConfig
  const apiKey = provided.apiKey || process.env.NEXT_PUBLIC_HONEYBADGER_API_KEY
  const assetsUrl = provided.assetsUrl || process.env.NEXT_PUBLIC_HONEYBADGER_ASSETS_URL

  if (!apiKey || !assetsUrl) {
    log('warn', silent, 'skipping source map upload; set apiKey and assetsUrl to enable it')
    return null
  }

  // `cleanOptions` merges as `{ ...defaults, ...options }`, so a key present with an
  // `undefined` value overwrites the default rather than falling back to it. An unset
  // revision would upload as `undefined` instead of `main`, and a fault whose revision
  // does not match its source map is never symbolicated — so drop empty values instead
  // of passing them through.
  const { cleanOptions } = await loadPluginCore()

  return cleanOptions(withoutUndefined({
    ...provided,
    apiKey,
    assetsUrl,
    revision: provided.revision || process.env.NEXT_PUBLIC_HONEYBADGER_REVISION,
    silent,
  }))
}

function withoutUndefined<T extends Record<string, unknown>>(options: T): T {
  return Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined)
  ) as T
}

// Mirrors plugin-core's DEFAULT_DEVELOPMENT_ENVIRONMENTS. Duplicated so a development
// build can be recognised before plugin-core is loaded — see uploadSourceMapsAfterBuild.
const DEFAULT_DEVELOPMENT_ENVIRONMENTS = ['dev', 'development', 'test']

function isDevEnv(developmentEnvironments: string[]): boolean {
  if (!process.env.NODE_ENV) {
    return false
  }

  return developmentEnvironments.includes(process.env.NODE_ENV)
}

async function walk(dir: string, onFile: (filePath: string) => void): Promise<void> {
  let entries: fs.Dirent[]
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true })
  }
  catch (error) {
    // A build output directory that isn't there is not an error worth failing on — the
    // server tree does not exist unless `experimental.serverSourceMaps` is on. Anything
    // else (permissions, I/O) would silently shrink the upload to whatever happened to be
    // readable, so let it propagate and be governed by `ignoreErrors`.
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return
    }

    throw error
  }

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(entryPath, onFile)
    } else if (entry.isFile()) {
      onFile(entryPath)
    }
  }
}

/**
 * A source map is only worth uploading when it carries the original sources. Next.js
 * emits maps without `sourcesContent` for some outputs, and those symbolicate to
 * nothing. Same check the rollup and esbuild plugins apply.
 */
async function hasSourcesContent(sourcemapFilePath: string): Promise<boolean> {
  try {
    const contents = await fs.promises.readFile(sourcemapFilePath, 'utf8')
    const parsed = JSON.parse(contents)
    return Array.isArray(parsed.sourcesContent) && parsed.sourcesContent.length > 0
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  catch (error) {
    return false
  }
}

/**
 * Finds the `.js` / `.js.map` pairs in the build output.
 *
 * `jsFilename` is the path relative to `distDir`, because that is what `assetsUrl`
 * addresses: the configuration templates point it at `<origin>/_next`, and `.next/x`
 * is served at `/_next/x`. `uploadSourcemap` builds `minified_url` by joining the two.
 *
 * Both `static/` and `server/` are walked. Server maps exist only when
 * `experimental.serverSourceMaps` is on, which `withHoneybadgerConfig` enables alongside
 * upload. Server chunks are not served over HTTP, so whether their frames match the
 * uploaded `minified_url` depends on the runtime path rewriting tracked in #1602 — but
 * not uploading them at all guarantees server frames stay minified, which is the defect
 * that issue reports.
 */
export async function collectSourcemaps(
  distDir: string,
  ignorePaths: string[] = []
): Promise<Types.SourcemapInfo[]> {
  const sourcemapFilePaths: string[] = []
  await walk(distDir, (filePath) => {
    if (filePath.endsWith('.js.map')) {
      sourcemapFilePaths.push(filePath)
    }
  })

  const collected: Types.SourcemapInfo[] = []

  for (const sourcemapFilePath of sourcemapFilePaths) {
    const jsFilePath = sourcemapFilePath.slice(0, -'.map'.length)

    if (!fs.existsSync(jsFilePath)) {
      continue
    }

    if (picomatch.isMatch(jsFilePath, ignorePaths, { basename: true })) {
      continue
    }

    if (!await hasSourcesContent(sourcemapFilePath)) {
      continue
    }

    // Posix separators: these become URL paths.
    const jsFilename = path.relative(distDir, jsFilePath).split(path.sep).join('/')

    collected.push({
      sourcemapFilename: path.relative(distDir, sourcemapFilePath).split(path.sep).join('/'),
      sourcemapFilePath,
      jsFilename,
      jsFilePath,
    })
  }

  return collected
}

/**
 * Removes the *browser* source map files after they have been uploaded.
 *
 * Only for maps this package caused to be generated. The predecessor to this hook built
 * them with webpack's `hidden-source-map`, so they were never served; Next.js has no
 * hidden equivalent, and its `productionBrowserSourceMaps` publishes them. Deleting after
 * upload restores the old outcome — Honeybadger has the maps, visitors do not.
 *
 * Server maps are deliberately left alone. `.next/server` is not served, so there is no
 * exposure to undo, and Next.js reads those maps itself when it formats server-side stack
 * traces — deleting them would degrade the project's own logs for no benefit.
 *
 * The `sourceMappingURL` comments in the emitted JavaScript are left behind, so a browser
 * that goes looking will get a 404 rather than the source.
 */
async function deleteBrowserSourcemapFiles(distDir: string, silent: boolean): Promise<void> {
  // Deliberately every `.js.map` under `static`, not just the ones that were uploaded.
  // `collectSourcemaps` drops maps that are ignored, malformed, unpaired, or missing
  // `sourcesContent` — all of which Next.js still serves. Deleting only what we uploaded
  // would leave exactly those behind, publicly readable, because of an option we turned on.
  const mapFilePaths: string[] = []
  await walk(path.join(distDir, BROWSER_OUTPUT_DIR), (filePath) => {
    if (filePath.endsWith('.js.map')) {
      mapFilePaths.push(filePath)
    }
  })

  let deleted = 0
  for (const mapFilePath of mapFilePaths) {
    try {
      await fs.promises.unlink(mapFilePath)
      deleted++
    } catch (error) {
      // Loud, and not gated behind `silent`: a map we failed to remove is one this package
      // caused to be served. That is exposure, not cleanup noise.
      log(
        'warn',
        silent,
        `could not delete ${path.relative(distDir, mapFilePath)}, so it will be served ` +
        `publicly: ${(error as Error).message}`
      )
    }
  }

  log('debug', silent, `deleted ${deleted} browser source map file(s) from the build output`)
}

/**
 * Uploads the build's source maps to Honeybadger.
 *
 * Registered by `withHoneybadgerConfig` on Next.js's `compiler.runAfterProductionCompile`
 * hook, which runs for both Turbopack and webpack builds — unlike the webpack plugin this
 * replaces, which Turbopack ignored entirely.
 *
 * Next.js re-throws whatever this hook throws, which would fail the user's build, so a
 * failed upload is only allowed to propagate when `ignoreErrors` is off.
 */
export async function uploadSourceMapsAfterBuild(
  honeybadgerNextJsConfig: HoneybadgerNextJsConfig | undefined,
  metadata: AfterProductionCompileMetadata,
  options: { deleteBrowserSourcemaps?: boolean } = {}
): Promise<void> {
  // Read from the raw config rather than the resolved options, because the error handling
  // below has to cover resolving them at all: `cleanOptions` can throw, and loading
  // plugin-core can fail outright. Doing that outside the try meant a failure there ignored
  // `ignoreErrors` and skipped the cleanup that keeps browser maps off the wire.
  const silent = honeybadgerNextJsConfig?.silent ?? true
  const ignoreErrors = honeybadgerNextJsConfig?.ignoreErrors ?? false

  // Outside the try/finally below: a build that never intended to upload also never enabled
  // the browser maps, so there is nothing of ours to clean up. Decided from the raw config
  // so it needs no plugin-core.
  const developmentEnvironments =
    honeybadgerNextJsConfig?.developmentEnvironments ?? DEFAULT_DEVELOPMENT_ENVIRONMENTS
  if (isDevEnv(developmentEnvironments)) {
    log('debug', silent, `skipping source map upload in ${process.env.NODE_ENV}`)
    return
  }

  try {
    const uploadOptions = await resolveUploadOptions(honeybadgerNextJsConfig)
    if (!uploadOptions) {
      return
    }

    const { uploadSourcemaps, sendDeployNotification } = await loadPluginCore()

    const sourcemaps = await collectSourcemaps(metadata.distDir, uploadOptions.ignorePaths)

    if (sourcemaps.length === 0) {
      // Upload is configured, so finding nothing means something is wrong — a `distDir`
      // that moved, or an `ignorePaths` that matches everything. Silence here would look
      // exactly like success.
      log('warn', silent, `found no source maps to upload in ${metadata.distDir}`)
      return
    }

    await uploadSourcemaps(sourcemaps, uploadOptions)

    // Only after maps actually went up. A failed upload already skips this by throwing, so
    // announcing a deploy for a build that uploaded nothing was the one inconsistent case —
    // and it reads as "the maps for this revision are in place" when they are not.
    if (uploadOptions.deploy) {
      await sendDeployNotification(uploadOptions)
    }
  } catch (error) {
    if (!ignoreErrors) {
      throw error
    }

    log('error', silent, `source map upload failed: ${(error as Error).message}`)
  } finally {
    // Unconditionally, including after a failed upload. We enabled
    // `productionBrowserSourceMaps`, so these maps ship publicly unless something removes
    // them — and `ignoreErrors: true`, which the docs recommend so an outage cannot block a
    // deploy, would otherwise turn every failed upload into published source. Keeping them
    // to preserve "the only copy" is not worth that: a rebuild regenerates them, whereas a
    // deploy that served them cannot be recalled.
    if (options.deleteBrowserSourcemaps) {
      try {
        await deleteBrowserSourcemapFiles(metadata.distDir, silent)
      } catch (error) {
        // Never let cleanup mask the upload failure that is already propagating.
        log(
          'warn',
          silent,
          `could not clean up browser source maps: ${(error as Error).message}`
        )
      }
    }
  }
}

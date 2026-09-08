import { HoneybadgerNextJsConfig } from './types'
import { isSourceMapUploadConfigured, uploadSourceMapsAfterBuild } from './source-maps'
import type { AfterProductionCompileMetadata } from './source-maps'

const HONEYBADGER_JS_PACKAGE = '@honeybadger-io/js'

let _silent = true

function log(type: 'error' | 'warn' | 'debug', msg: string): void {
  if (['error', 'warn'].includes(type) || !_silent) {
    console[type]('[HoneybadgerNextJs]', msg)
  }
}

/**
 * Next.js warns when a package that requires files dynamically is bundled into the
 * server build. @honeybadger-io/js does exactly that, so it has to be listed as an
 * external package.
 *
 * First reported in https://github.com/honeybadger-io/honeybadger-js/issues/1351,
 * caused by https://github.com/honeybadger-io/honeybadger-js/pull/1268.
 *
 * `serverExternalPackages` is unconditionally available from Next 15 onwards, which is
 * this package's minimum supported version, so the older
 * `experimental.serverComponentsExternalPackages` fallback is gone.
 */
function withHoneybadgerExternalized(serverExternalPackages: unknown): string[] {
  if (!Array.isArray(serverExternalPackages)) {
    log('debug', `adding serverExternalPackages option with value ["${HONEYBADGER_JS_PACKAGE}"]`)
    return [HONEYBADGER_JS_PACKAGE]
  }

  if (serverExternalPackages.includes(HONEYBADGER_JS_PACKAGE)) {
    return serverExternalPackages as string[]
  }

  log('debug', `adding ${HONEYBADGER_JS_PACKAGE} to serverExternalPackages`)
  return [...serverExternalPackages as string[], HONEYBADGER_JS_PACKAGE]
}

type CompilerConfig = {
  runAfterProductionCompile?: (metadata: AfterProductionCompileMetadata) => unknown
}

type ExperimentalConfig = {
  serverSourceMaps?: boolean
}

/**
 * The parts of a Next.js config this function reads.
 *
 * Structural on purpose, rather than `import type { NextConfig } from 'next'`. Importing it
 * would bake whichever Next.js version this package was built against into the published
 * declaration files, and `NextConfig` is not compatible across the supported range — Next 16
 * widened `headers()` to return `Header[] | Promise<Header[]>`, so a Next 16 user passing
 * their own `NextConfig` got a type error against our Next 15 copy of it.
 *
 * This is the type the config is *read* through, not the generic constraint. Constraining
 * to it directly is not possible: the two things callers do are mutually exclusive under
 * excess-property checking. `NextConfig` is an interface with no index signature, so a
 * constraint carrying `[key: string]: unknown` rejects it — while a constraint without one
 * rejects an inline literal that sets any other Next.js option, such as `reactStrictMode`.
 * So the generic stays `object` and the strictness lives at the call site, where the caller
 * annotates their own config as `NextConfig`.
 */
type NextConfigLike = {
  serverExternalPackages?: string[]
  productionBrowserSourceMaps?: boolean
  experimental?: ExperimentalConfig
  compiler?: CompilerConfig
}

/**
 * Registers the source map upload on Next.js's post-compile hook, composing with any hook
 * the project already declares rather than replacing it.
 *
 * The hook runs for both Turbopack and webpack builds — it is invoked from the generic
 * build pipeline — which is the whole reason upload moved here from a webpack plugin.
 * Next.js documents it as being "useful for third-party tools to collect build outputs
 * like sourcemaps".
 */
function withSourceMapUpload(
  compiler: CompilerConfig | undefined,
  honeybadgerNextJsConfig: HoneybadgerNextJsConfig | undefined,
  deleteBrowserSourcemaps: boolean
): CompilerConfig {
  const existingHook = compiler?.runAfterProductionCompile

  return {
    ...compiler,
    runAfterProductionCompile: async (metadata: AfterProductionCompileMetadata) => {
      // The project's own hook runs first, and is not swallowed: if it throws, that is
      // its build failing, not ours.
      if (typeof existingHook === 'function') {
        await existingHook(metadata)
      }

      await uploadSourceMapsAfterBuild(honeybadgerNextJsConfig, metadata, { deleteBrowserSourcemaps })
    },
  }
}

/**
 * Opts into server source maps, so frames from `.next/server` can be symbolicated too.
 *
 * `productionBrowserSourceMaps` covers only the browser build. The webpack plugin this
 * replaces set `devtool: 'hidden-source-map'` with no `isServer` guard, so it ran for the
 * browser, server and edge compilations alike — server maps were written to disk even
 * though that plugin only ever uploaded the client ones, which is
 * https://github.com/honeybadger-io/honeybadger-js/issues/1602. Without this option the
 * new hook has strictly less to collect than the old plugin generated.
 *
 * Unlike the browser maps, these are never published: `.next/server` is not served, so
 * they are left in place after upload rather than deleted.
 */
function withServerSourceMaps(
  experimental: ExperimentalConfig | undefined,
  enable: boolean
): ExperimentalConfig | undefined {
  // An explicit setting is the project's call, either way.
  if (!enable || experimental?.serverSourceMaps !== undefined) {
    return experimental
  }

  log('debug', 'enabling experimental.serverSourceMaps so server frames can be symbolicated')
  return { ...experimental, serverSourceMaps: true }
}

/**
 * Wraps a Next.js config so Honeybadger's build-time requirements are applied: the
 * `@honeybadger-io/js` externalization, and source map upload after a production build.
 *
 * Instrumentation itself is not set up here — that moved to the bundler-agnostic
 * `instrumentation.ts` / `instrumentation-client.ts` conventions, so it works under both
 * Turbopack and webpack. See https://github.com/honeybadger-io/honeybadger-js/issues/1434.
 */
export function withHoneybadgerConfig<T extends object>(
  config: T = {} as T,
  honeybadgerNextJsConfig?: HoneybadgerNextJsConfig
): T {
  _silent = honeybadgerNextJsConfig?.silent ?? true

  const given = config as NextConfigLike

  const uploadConfigured = isSourceMapUploadConfigured(honeybadgerNextJsConfig)

  // Next.js does not emit production browser source maps unless asked, so upload would
  // find nothing to send. The webpack plugin this replaces got them by setting
  // `devtool: 'hidden-source-map'`, which Turbopack ignores and Next.js has no equivalent
  // for — `productionBrowserSourceMaps` is the only switch, and it also serves them.
  //
  // So turn it on when upload is configured, and have the post-build step delete the maps
  // once they are uploaded. An explicit setting is always respected: a project that asked
  // for served source maps keeps them, and keeps them served.
  const enableBrowserSourceMaps =
    given.productionBrowserSourceMaps === undefined && uploadConfigured

  const experimental = withServerSourceMaps(
    given.experimental,
    uploadConfigured
  )

  return {
    ...config,
    serverExternalPackages: withHoneybadgerExternalized(given.serverExternalPackages),
    productionBrowserSourceMaps: enableBrowserSourceMaps ? true : given.productionBrowserSourceMaps,
    // Only introduce the key when there is something to put in it, so a config that never
    // mentioned `experimental` does not suddenly grow the field.
    ...(experimental ? { experimental } : {}),
    compiler: withSourceMapUpload(
      given.compiler,
      honeybadgerNextJsConfig,
      enableBrowserSourceMaps
    ),
  } as T
}

/**
 * Options for `withHoneybadgerConfig`.
 *
 * These are flat. The source map options used to sit under a nested `webpackPluginOptions`
 * key, named after the `@honeybadger-io/webpack` plugin that did the upload — but Turbopack
 * ignores webpack plugins entirely, so that plugin is gone and upload now runs on Next.js's
 * `compiler.runAfterProductionCompile` hook. The nesting and the name described machinery
 * that no longer exists, and `silent` had to be declared twice to work around it.
 *
 * `apiKey` and `assetsUrl` are what enable source map upload; both fall back to
 * `NEXT_PUBLIC_HONEYBADGER_API_KEY` and `NEXT_PUBLIC_HONEYBADGER_ASSETS_URL`. Everything
 * else is optional and defaulted by `@honeybadger-io/plugin-core`.
 */
export type HoneybadgerNextJsConfig = {
  /** Honeybadger project API key. */
  apiKey?: string
  /** Public URL of the build output, normally `https://your-site.com/_next`. */
  assetsUrl?: string
  /** Ties uploaded maps to the errors that reference them; they must match to symbolicate. */
  revision?: string
  endpoint?: string
  /** Suppresses this package's informational logging. Warnings and errors always print. */
  silent?: boolean
  /** Log a failed upload instead of failing the build. */
  ignoreErrors?: boolean
  /** Globs, matched against the built JavaScript files, whose maps are not uploaded. */
  ignorePaths?: Array<string>
  /** `NODE_ENV` values for which upload is skipped entirely. */
  developmentEnvironments?: Array<string>
  retries?: number
  workerCount?: number
  /** Send a deploy notification once the maps are uploaded. */
  deploy?: false | {
    repository?: string,
    environment?: string,
    localUsername?: string,
  }
  /** Turn off source map upload without removing the rest of the configuration. */
  disableSourceMapUpload?: boolean
}

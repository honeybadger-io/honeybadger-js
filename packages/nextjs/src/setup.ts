import { HoneybadgerNextJsConfig } from './types'

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

/**
 * Wraps a Next.js config so Honeybadger's build-time requirements are applied.
 *
 * Instrumentation itself is no longer set up here — that moved to the bundler-agnostic
 * `instrumentation.ts` / `instrumentation-client.ts` conventions, so it works under both
 * Turbopack and webpack. See https://github.com/honeybadger-io/honeybadger-js/issues/1434.
 */
export function withHoneybadgerConfig<T extends Record<string, unknown>>(
  config: T = {} as T,
  honeybadgerNextJsConfig?: HoneybadgerNextJsConfig
): T {
  _silent = honeybadgerNextJsConfig?.silent ?? true

  return {
    ...config,
    serverExternalPackages: withHoneybadgerExternalized(config.serverExternalPackages),
  }
}

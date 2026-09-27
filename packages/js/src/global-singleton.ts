import { Util } from '@honeybadger-io/core'

/**
 * Which build the singleton belongs to. The server and browser builds are different
 * classes — only the server client has `withRequest`, `lambdaHandler` and friends, and
 * only the browser client can show the user feedback form — so they must never share a
 * slot, even though a bundler can load both into one realm.
 */
export type SingletonTarget = 'browser' | 'server'

/**
 * Set this on the global object before the package is loaded to opt out of sharing.
 * Two independently bundled copies on one page then keep their own clients, the way
 * they did before the singleton was shared.
 */
export const DISABLE_GLOBAL_SINGLETON_KEY = '__HONEYBADGER_DISABLE_GLOBAL_SINGLETON__'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GlobalLike = Record<string, any>

/**
 * Stamped on the client when it is stored, and required when it is read back, so the slot
 * is only ever trusted when this package wrote it. Duck typing would not do: a value that
 * happens to carry a `notify` method would be handed out as the client.
 */
const CLIENT_MARKER = '__honeybadger_client__'

export function singletonKey(target: SingletonTarget, version: string): string {
  return `__honeybadger_singleton_${target}_${version}__`
}

function isSingleton(value: unknown): boolean {
  return !!value && (value as GlobalLike)[CLIENT_MARKER] === true
}

function markAsSingleton(client: unknown): void {
  Object.defineProperty(client, CLIENT_MARKER, {
    value: true,
    writable: false,
    configurable: true,
    enumerable: false,
  })
}

/**
 * Returns the client stored on the global object, creating and storing it the first time.
 *
 * Bundlers can emit more than one copy of this module — Next.js compiles the
 * instrumentation, page-rendering and edge contexts into separate module graphs — and
 * each copy would otherwise build its own client. Only the copy the configuration code
 * ran in would be configured, so a `Honeybadger.notify()` made through any other copy
 * would silently do nothing. Keeping the instance on the realm's global object lets every
 * copy find the same configured client.
 *
 * The slot is keyed by build target and by exact version: an older copy must never be
 * handed to a newer caller that would then call a method it does not have. Two different
 * versions in one realm fall back to one client each, which is the behaviour that shipped
 * before the singleton was shared.
 */
export function getOrCreateSingleton<T>(
  target: SingletonTarget,
  version: string,
  create: () => T,
  _global: GlobalLike = Util.globalThisOrWindow() as unknown as GlobalLike
): T {
  if (!_global) {
    return create()
  }

  const key = singletonKey(target, version)
  let shared: T
  let canShare = false

  // Reading the global object can throw as easily as writing to it can: the opt-out
  // flag, the slot and the marker are all ordinary properties, and a host or another
  // script may have installed a getter on any of them. `create()` stays outside, so a
  // genuine failure to build the client still propagates.
  try {
    if (_global[DISABLE_GLOBAL_SINGLETON_KEY] !== true) {
      canShare = true

      const existing = _global[key]
      if (isSingleton(existing)) {
        shared = existing as T
      }
    }
  }
  catch (_e) {
    canShare = false
  }

  if (shared) {
    return shared
  }

  const created = create()

  if (!canShare) {
    return created
  }

  try {
    markAsSingleton(created)
    Object.defineProperty(_global, key, {
      value: created,
      writable: true,
      configurable: true,
      enumerable: false,
    })
  }
  catch (_e) {
    // A frozen global object (node --frozen-intrinsics, SES lockdown). Importing this
    // package must never throw, so this copy keeps the client to itself.
  }

  return created
}

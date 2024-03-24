/* eslint-disable prefer-rest-params */
import * as stackTraceParser from 'stacktrace-parser'
import {
  Logger, BacktraceFrame, Notice, Noticeable, BeforeNotifyHandler, AfterNotifyHandler, Config, BrowserConfig
} from './types'

export function merge<T1 extends Record<string, unknown>, T2 extends Record<string, unknown>>(obj1: T1, obj2: T2): T1 & T2 {
  const result = {} as Record<keyof T1 | keyof T2, unknown>
  for (const k in obj1) {
    result[k] = obj1[k]
  }
  for (const k in obj2) {
    result[k] = obj2[k]
  }
  return result as T1 & T2
}

export function mergeNotice(notice1: Partial<Notice>, notice2: Partial<Notice>): Partial<Notice> {
  const result = merge(notice1, notice2)
  if (notice1.context && notice2.context) {
    result.context = merge(notice1.context, notice2.context)
  }
  return result
}

export function objectIsEmpty(obj): boolean {
  for (const k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      return false
    }
  }
  return true
}

export function objectIsExtensible(obj): boolean {
  if (typeof Object.isExtensible !== 'function') {
    return true
  }
  return Object.isExtensible(obj)
}

export function makeBacktrace(stack: string, filterHbSourceCode = false, logger: Logger = console): BacktraceFrame[] {
  if (!stack) {
    return []
  }

  try {
    const backtrace = stackTraceParser
      .parse(stack)
      .map(line => {
        return {
          file: line.file,
          method: line.methodName,
          number: line.lineNumber,
          column: line.column
        }
      })
    if (filterHbSourceCode) {
      backtrace.splice(0, calculateBacktraceShift(backtrace))
    }

    return backtrace
  } catch (err) {
    logger.debug(err)
    return []
  }
}

function isFrameFromHbSourceCode(frame: BacktraceFrame) {
  let hasHbFile = false
  let hasHbMethod = false
  if (frame.file) {
    hasHbFile = frame.file.toLowerCase().indexOf('@honeybadger-io') > -1
  }
  if (frame.method) {
    hasHbMethod = frame.method.toLowerCase().indexOf('@honeybadger-io') > -1
  }

  return hasHbFile || hasHbMethod
}

export const DEFAULT_BACKTRACE_SHIFT = 3

/**
 * If {@link generateStackTrace} is used, we want to exclude frames that come from
 * Honeybadger's source code.
 *
 * Logic:
 * - For each frame, increment the shift if source code is from Honeybadger
 * - If a frame from an <anonymous> file is encountered increment the shift ONLY if between Honeybadger source code
 *   (i.e. previous and next frames are from Honeybadger)
 * - Exit when frame encountered is not from Honeybadger source code
 *
 * Note: this will not always work, especially in browser versions where code
 *       is minified, uglified and bundled.
 *       For those cases we default to 3:
 *       - generateStackTrace
 *       - makeNotice
 *       - notify
 */
export function calculateBacktraceShift(backtrace: BacktraceFrame[]) {
  let shift = 0
  for (let i = 0; i < backtrace.length; i++) {
    const frame = backtrace[i]
    if (isFrameFromHbSourceCode(frame)) {
      shift++
      continue
    }

    if (!frame.file || frame.file === '<anonymous>') {
      const nextFrame = backtrace[i + 1]
      if (nextFrame && isFrameFromHbSourceCode(nextFrame)) {
        shift++
        continue
      }
    }

    break
  }

  return shift || DEFAULT_BACKTRACE_SHIFT
}

export function getCauses(notice: Partial<Notice>, logger: Logger) {
  if (notice.cause) {
    const causes =[]
    let cause = notice as Error
    // @ts-ignore this throws an error if tsconfig.json has strict: true
    while (causes.length < 3 && (cause = cause.cause) as Error) {
      causes.push({
        class: cause.name,
        message: cause.message,
        backtrace: typeof cause.stack == 'string' ? makeBacktrace(cause.stack, false, logger) : null
      })
    }
    return causes
  }

  return []
}

export async function getSourceForBacktrace(backtrace: BacktraceFrame[],
  getSourceFileHandler: (path: string) => Promise<string>): Promise<Record<string, string>[]> {

  const result: Record<string, string>[] = []
  if (!getSourceFileHandler || !backtrace || !backtrace.length) {
    return result
  }

  let index = 0
  while (backtrace.length) {
    const trace = backtrace.splice(0)[index]

    const fileContent = await getSourceFileHandler(trace.file)
    result[index] = getSourceCodeSnippet(fileContent, trace.number)
    index++
  }
  return result
}

export function runBeforeNotifyHandlers(notice: Notice | null, handlers: BeforeNotifyHandler[]): { results: ReturnType<BeforeNotifyHandler>[], result: boolean } {
  const results: ReturnType<BeforeNotifyHandler>[] = []
  let result = true
  for (let i = 0, len = handlers.length; i < len; i++) {
    const handler = handlers[i]
    const handlerResult = handler(notice)
    if (handlerResult === false) {
      result = false
    }

    results.push(handlerResult)
  }

  return {
    results,
    result
  }
}

export function runAfterNotifyHandlers(notice: Notice | null, handlers: AfterNotifyHandler[], error?: Error): boolean {
  if (notice && notice.afterNotify) {
    notice.afterNotify(error, notice)
  }

  for (let i = 0, len = handlers.length; i < len; i++) {
    handlers[i](error, notice)
  }
  return true
}

// Returns a new object with properties from other object.
export function shallowClone<T>(obj: T): T | Record<string, unknown> {
  if (typeof (obj) !== 'object' || obj === null) {
    return {}
  }
  const result = {} as T
  for (const k in obj) {
    result[k] = obj[k]
  }
  return result
}

export function sanitize(obj, maxDepth = 8) {
  const seenObjects = []

  function seen(obj) {
    if (!obj || typeof (obj) !== 'object') {
      return false
    }
    for (let i = 0; i < seenObjects.length; i++) {
      const value = seenObjects[i]
      if (value === obj) {
        return true
      }
    }
    seenObjects.push(obj)
    return false
  }

  function canSerialize(obj) {
    const typeOfObj = typeof obj

    // Functions are TMI
    if (/function/.test(typeOfObj)) {
      // Let special toJSON method pass as it's used by JSON.stringify (#722)
      return obj.name === 'toJSON'
    }

    // Symbols can't convert to strings.
    if (/symbol/.test(typeOfObj)) {
      return false
    }

    if (obj === null) {
      return false
    }

    // No prototype, likely created with `Object.create(null)`.
    if (typeof obj === 'object' && typeof obj.hasOwnProperty === 'undefined') {
      return false
    }

    return true
  }

  function serialize(obj: unknown, depth = 0) {
    if (depth >= maxDepth) {
      return '[DEPTH]'
    }

    // Inspect invalid types
    if (!canSerialize(obj)) {
      return Object.prototype.toString.call(obj)
    }

    // Halt circular references
    if (seen(obj)) {
      return '[RECURSION]'
    }

    // Serialize inside arrays
    if (Array.isArray(obj)) {
      return obj.map(o => safeSerialize(o, depth + 1))
    }

    // Serialize inside objects
    if (typeof (obj) === 'object') {
      const ret = {}
      for (const k in obj) {
        const v = obj[k]
        if (Object.prototype.hasOwnProperty.call(obj, k) && (k != null) && (v != null)) {
          ret[k] = safeSerialize(v, depth + 1)
        }
      }
      return ret
    }

    // Return everything else untouched
    return obj
  }

  function safeSerialize(obj: unknown, depth = 0) {
    try {
      return serialize(obj, depth)
    } catch(e) {
      return `[ERROR] ${e}`
    }
  }

  return safeSerialize(obj)
}

export function logger(client: { config: { debug: boolean; logger: Logger; } }): Logger {
  const log = (method: string) => {
    return function (...args: unknown[]) {
      if (method === 'debug') {
        if (!client.config.debug) { return }
        // Log at default level so that you don't need to also enable verbose
        // logging in Chrome.
        method = 'log'
      }
      args.unshift('[Honeybadger]')
      client.config.logger[method](...args)
    }
  }
  return {
    log: log('log'),
    info: log('info'),
    debug: log('debug'),
    warn: log('warn'),
    error: log('error')
  }
}

/**
 * Converts any object into a notice object (which at minimum has the same
 * properties as Error, but supports additional Honeybadger properties.)
 */
export function makeNotice(thing: Noticeable): Partial<Notice> {
  let notice

  if (!thing) {
    notice = {}
  } else if (isErrorObject(thing)) {
    const e = thing as Error
    notice = merge(thing as Record<string, unknown>, { name: e.name, message: e.message, stack: e.stack, cause: e.cause })
  } else if (typeof thing === 'object') {
    notice = shallowClone(thing)
  } else {
    const m = String(thing)
    notice = { message: m }
  }

  return notice
}

export function isErrorObject(thing: unknown) {
  return thing instanceof Error
      || Object.prototype.toString.call(thing) === '[object Error]' // Important for cross-realm objects
}

/**
 * Instrument an existing function inside an object (usually global).
 * @param {!Object} object
 * @param {!String} name
 * @param {!Function} replacement
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function instrument(object: Record<string, any>, name: string, replacement: (unknown) => unknown): void {
  if (!object || !name || !replacement || !(name in object)) {
    return
  }
  try {
    let original = object[name]
    while (original && original.__hb_original) {
      original = original.__hb_original
    }
    object[name] = replacement(original)
    object[name].__hb_original = original
  } catch (_e) {
    // Ignores errors where "original" is a restricted object (see #1001)
    // Uncaught Error: Permission denied to access property "__hb_original"

    // Also ignores:
    //   Error: TypeError: Cannot set property onunhandledrejection of [object Object] which has only a getter
    //   User-Agent: Mozilla/5.0 (Linux; Android 10; SAMSUNG SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/12.1 Chrome/79.0.3945.136 Mobile Safari/537.36
  }
}

let _consoleAlreadyInstrumented = false

const listeners = []
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function instrumentConsole(_window: any, handler: (method: string, args: unknown[]) => void): void {
  if (!_window || !_window.console || !handler) {
    return
  }

  listeners.push(handler)

  if (_consoleAlreadyInstrumented) {
    return
  }

  _consoleAlreadyInstrumented = true;

  ['debug', 'info', 'warn', 'error', 'log'].forEach(level => {
    instrument(_window.console, level, function hbLogger(original) {
      return function () {
        const args = Array.prototype.slice.call(arguments)
        listeners.forEach((listener) => {
          try {
            listener(level, args)
          }
          catch (_e) {
            // ignore
            // should never reach here because instrument method already wraps with try/catch block
          }
        })

        if (typeof original === 'function') {
          Function.prototype.apply.call(original, _window.console, arguments)
        }
      }
    })
  })
}

export function endpoint(base: string, path: string): string {
  const endpoint = base.trim().replace(/\/$/, '')
  path = path.trim().replace(/(^\/|\/$)/g, '')
  return `${endpoint}/${path}`;
}

export function generateStackTrace(): string {
  try {
    throw new Error('')
  } catch (e) {
    if (e.stack) {
      return e.stack
    }
  }

  const maxStackSize = 10
  const stack = []
  let curr = arguments.callee
  while (curr && stack.length < maxStackSize) {
    if (/function(?:\s+([\w$]+))+\s*\(/.test(curr.toString())) {
      stack.push(RegExp.$1 || '<anonymous>')
    } else {
      stack.push('<anonymous>')
    }
    try {
      curr = curr.caller
    } catch (e) {
      break
    }
  }

  return stack.join('\n')
}

export function filter(obj: Record<string, unknown>, filters: string[]): Record<string, unknown> {
  if (!is('Object', obj)) {
    return
  }

  if (!is('Array', filters)) {
    filters = []
  }

  const seen = []

  function filter(obj) {
    let k: string, newObj: Record<string, unknown>

    if (is('Object', obj) || is('Array', obj)) {
      if (seen.indexOf(obj) !== -1) {
        return '[CIRCULAR DATA STRUCTURE]'
      }
      seen.push(obj)
    }

    if (is('Object', obj)) {
      newObj = {}
      for (k in obj) {
        if (filterMatch(k, filters)) {
          newObj[k] = '[FILTERED]'
        } else {
          newObj[k] = filter(obj[k])
        }
      }
      return newObj
    }

    if (is('Array', obj)) {
      return obj.map(function (v) {
        return filter(v)
      })
    }

    if (is('Function', obj)) {
      return '[FUNC]'
    }

    return obj
  }

  return filter(obj)
}

function filterMatch(key: string, filters: string[]): boolean {
  for (let i = 0; i < filters.length; i++) {
    if (key.toLowerCase().indexOf(filters[i].toLowerCase()) !== -1) {
      return true
    }
  }
  return false
}

function is(type: string, obj: unknown): boolean {
  const klass = Object.prototype.toString.call(obj).slice(8, -1)
  return obj !== undefined && obj !== null && klass === type
}

export function filterUrl(url: string, filters: string[]): string {
  if (!filters) {
    return url
  }
  if (typeof url !== 'string') {
    return url
  }

  const query = url.split(/\?/, 2)[1]
  if (!query) {
    return url
  }

  let result = url
  query.split(/[&]\s?/).forEach((pair) => {
    const [key, value] = pair.split('=', 2)
    if (filterMatch(key, filters)) {
      result = result.replace(`${key}=${value}`, `${key}=[FILTERED]`)
    }
  })

  return result
}

export function formatCGIData(vars: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const formattedVars = {}

  Object.keys(vars).forEach(function (key) {
    const formattedKey = prefix + key.replace(/\W/g, '_').toUpperCase()
    formattedVars[formattedKey] = vars[key]
  })

  return formattedVars
}

export function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

function getSourceCodeSnippet(fileData: string, lineNumber: number, sourceRadius = 2): Record<string, string> {
  if (!fileData) {
    return null
  }
  const lines = fileData.split('\n')
  // add one empty line because array index starts from 0, but error line number is counted from 1
  lines.unshift('')
  const start = lineNumber - sourceRadius
  const end = lineNumber + sourceRadius
  const result = {}
  for (let i = start; i <= end; i++) {
    const line = lines[i]
    if (typeof line === 'string') {
      result[i] = line
    }
  }
  return result
}

export function isBrowserConfig(config: BrowserConfig | Config): config is BrowserConfig {
  return (config as BrowserConfig).async !== undefined
}

/** globalThis has fairly good support. But just in case, lets check its defined.
 * @see {https://caniuse.com/?search=globalThis}
 */
export function globalThisOrWindow () {
  if (typeof globalThis !== 'undefined') {
    return globalThis
  }

  if (typeof self !== 'undefined') {
    return self
  }

  return window
}

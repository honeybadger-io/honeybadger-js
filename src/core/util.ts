import * as stackTraceParser from 'stacktrace-parser'
import Client from '../core/client'
import { Logger, Config, BacktraceFrame } from '../core/types'

export function merge(obj1: any, obj2: any): any {
  const result = {}
  for (const k in obj1) { result[k] = obj1[k] }
  for (const k in obj2) { result[k] = obj2[k] }
  return result
}

export function mergeNotice(notice1: any, notice2: any): any {
  const result = merge(notice1, notice2)
  if (notice1.context && notice2.context) {
    result.context = merge(notice1.context, notice2.context)
  }
  return result
}

export function objectIsEmpty(obj) {
  for (const k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      return false
    }
  }
  return true
}

export function objectIsExtensible(obj) {
  if (typeof Object.isExtensible !== 'function') { return true }
  return Object.isExtensible(obj)
}

export function makeBacktrace(stack: string, shift = 0): BacktraceFrame[] {
  try {
    const backtrace = stackTraceParser.parse(stack).map(line => {
      return {
        file: line.file,
        method: line.methodName,
        number: line.lineNumber,
        column: line.column,
        context: 'unknown'
      }
    })
    backtrace.splice(0, shift)
    return backtrace
  } catch (_err) {
    // TODO: log error
    return []
  }
}

export function runBeforeNotifyHandlers(notice, handlers) {
  for (let i = 0, len = handlers.length; i < len; i++) {
    const handler = handlers[i]
    if (handler(notice) === false) {
      return false
    }
  }
  return true
}

export function runAfterNotifyHandlers(notice, handlers, error = undefined) {
  for (let i = 0, len = handlers.length; i < len; i++) {
    handlers[i](error, notice)
  }
  return true
}

// Returns a new object with properties from other object.
export function newObject(obj) {
  if (typeof (obj) !== 'object') { return {} }
  const result = {}
  for (const k in obj) { result[k] = obj[k] }
  return result
}

export function sanitize(obj, maxDepth = 8) {
  const seenObjects = []
  function seen(obj) {
    if (!obj || typeof (obj) !== 'object') { return false }
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
    // Functions are TMI and Symbols can't convert to strings.
    if (/function|symbol/.test(typeof (obj))) { return false }

    if (obj === null) { return false }

    // No prototype, likely created with `Object.create(null)`.
    if (typeof obj === 'object' && typeof obj.hasOwnProperty === 'undefined') { return false }

    return true
  }

  function serialize(obj: any, depth = 0) {
    if (depth >= maxDepth) {
      return '[DEPTH]'
    }

    // Inspect invalid types
    if (!canSerialize(obj)) { return Object.prototype.toString.call(obj) }

    // Halt circular references
    if (seen(obj)) {
      return '[RECURSION]'
    }

    // Serialize inside arrays
    if (Array.isArray(obj)) {
      return obj.map(o => serialize(o, depth + 1))
    }

    // Serialize inside objects
    if (typeof (obj) === 'object') {
      const ret = {}
      for (const k in obj) {
        const v = obj[k]
        if (Object.prototype.hasOwnProperty.call(obj, k) && (k != null) && (v != null)) {
          ret[k] = serialize(v, depth + 1)
        }
      }
      return ret
    }

    // Return everything else untouched
    return obj
  }

  return serialize(obj)
}

export function logger(client: Client): Logger {
  const log = (method: string) => {
    return function (...args: unknown[]) {
      if (method === 'debug' && !client.config.debug) { return }
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
 * @param {!Object} notice
 */
export function makeNotice(thing) {
  let notice

  if (!thing) {
    notice = {}
  } else if (Object.prototype.toString.call(thing) === '[object Error]') {
    const e = thing
    notice = merge(thing, { name: e.name, message: e.message, stack: e.stack })
  } else if (typeof thing === 'object') {
    notice = newObject(thing)
  } else {
    const m = String(thing)
    notice = { message: m }
  }

  return notice
}

/**
 * Instrument an existing function inside an object (usually global).
 * @param {!Object} object
 * @param {!String} name
 * @param {!Function} replacement
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function instrument(object: Record<string, any>, name: string, replacement: (unknown) => void): void {
  if (!object || !name || !replacement || !(name in object)) { return }

  let original = object[name]
  while (original && original.__hb_original) {
    original = original.__hb_original
  }

  try {
    object[name] = replacement(original)
    object[name].__hb_original = original
  } catch(_e) {
    // Ignores errors like this one:
    //   Error: TypeError: Cannot set property onunhandledrejection of [object Object] which has only a getter
    //   User-Agent: Mozilla/5.0 (Linux; Android 10; SAMSUNG SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/12.1 Chrome/79.0.3945.136 Mobile Safari/537.36
  }
}

export function endpoint(config: Config, path: string): string {
  const endpoint = config.endpoint.trim().replace(/\/$/, '')
  path = path.trim().replace(/(^\/|\/$)/g, '')
  return `${endpoint}/${path}`;
}

export function generateStackTrace(): string {
  try {
    throw new Error('')
  } catch(e) {
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
      return obj.map(function(v) { return filter(v) })
    }

    if (is('Function', obj)) { return '[FUNC]' }

    return obj
  }

  return filter(obj)
}

function filterMatch(key: string, filters: string[]) {
  for (let i = 0; i < filters.length; i++) {
    if (key.toLowerCase().indexOf(filters[i].toLowerCase()) !== -1) {
      return true
    }
  }
  return false
}

function is(type: string, obj: any) {
  const klass = Object.prototype.toString.call(obj).slice(8, -1)
  return obj !== undefined && obj !== null && klass === type
}

export function filterUrl(url:string, filters: string[]): string {
  if (!filters) { return url }
  if (typeof url !== 'string') { return url }

  const [_, query] = url.split(/\?/, 2)
  if (!query) { return url }

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

  Object.keys(vars).forEach(function(key) {
    const formattedKey = prefix + key.replace(/\W/g, '_').toUpperCase()
    formattedVars[formattedKey] = vars[key]
  })

  return formattedVars
}

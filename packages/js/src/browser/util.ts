/**
 * Converts an HTMLElement into a human-readable string.
 * @param {!HTMLElement} element
 * @return {string}
 */
export function stringNameOfElement (element: HTMLElement): string {
  if (!element || !element.tagName) { return '' }

  let name = element.tagName.toLowerCase()

  // Ignore the root <html> element in selectors and events.
  if (name === 'html') { return '' }

  if (element.id) {
    name += `#${element.id}`
  }

  const stringClassNames = element.getAttribute('class')
  if (stringClassNames) {
    stringClassNames.split(/\s+/).forEach(className => {
      name += `.${className}`
    })
  }

  ['alt', 'name', 'title', 'type'].forEach(attrName => {
    const attr = element.getAttribute(attrName)
    if (attr) {
      name += `[${attrName}="${attr}"]`
    }
  })

  const siblings = getSiblings(element)
  if (siblings.length > 1) {
    name += `:nth-child(${Array.prototype.indexOf.call(siblings, element) + 1})`
  }

  return name
}

export function stringSelectorOfElement(element) {
  const name = stringNameOfElement(element)

  if (element.parentNode && element.parentNode.tagName) {
    const parentName = stringSelectorOfElement(element.parentNode)
    if (parentName.length > 0) {
      return `${parentName} > ${name}`
    }
  }

  return name
}

export function stringTextOfElement(element) {
  let text = element.textContent || element.innerText || ''
  if (!text && (element.type === 'submit' || element.type === 'button')) { text = element.value }
  return truncate(text.trim(), 300)
}

export function nativeFetch () {
  const global = globalThisOrWindow()

  if (!global.fetch) { return false }
  if (isNative(global.fetch)) { return true }
  if (typeof document === 'undefined') { return false }

  // If fetch isn't native, it may be wrapped by someone else. Try to get
  // a pristine function from an iframe.
  try {
    const sandbox = document.createElement('iframe')
    sandbox.style.display = 'none'
    document.head.appendChild(sandbox)
    const result = sandbox.contentWindow.fetch && isNative(sandbox.contentWindow.fetch)
    document.head.removeChild(sandbox)
    return result
  } catch (err) {
    if (console && console.warn) {
      console.warn('failed to detect native fetch via iframe: ' + err)
    }
  }

  return false
}

function isNative(func) {
  return func.toString().indexOf('native') !== -1
}

export function parseURL(url: string) {
  // Regexp: https://tools.ietf.org/html/rfc3986#appendix-B
  const match = url.match(/^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?$/) || {}

  return {
    protocol: match[2],
    host: match[4],
    pathname: match[5]
  }
}

export function localURLPathname(url: string) {
  const parsed = parseURL(url)
  const parsedDocURL = parseURL(document.URL)

  // URL must be relative
  if (!parsed.host || !parsed.protocol) {
    return parsed.pathname
  }

  // Same domain
  if (parsed.protocol === parsedDocURL.protocol && parsed.host === parsedDocURL.host) {
    return parsed.pathname
  }

  // x-domain
  return `${parsed.protocol}://${parsed.host}${parsed.pathname}`
}

export function decodeCookie(string: string): Record<string, unknown> {
  const result = {}
  string.split(/[;,]\s?/).forEach((pair) => {
    const [key, value] = pair.split('=', 2)
    result[key] = value
  })

  return result
}

export function encodeCookie (object) {
  if (typeof object !== 'object') {
    return undefined
  }

  const cookies = []
  for (const k in object) {
    cookies.push(k + '=' + object[k])
  }

  return cookies.join(';')
}

// Helpers

function getSiblings(element) {
  try {
    const nodes = element.parentNode.childNodes
    const siblings = []

    Array.prototype.forEach.call(nodes, node => {
      if (node.tagName && node.tagName === element.tagName) {
        siblings.push(node)
      }
    })

    return siblings
  } catch (e) {
    return []
  }
}

function truncate(string, length) {
  if (string.length > length) {
    string = string.substr(0, length) + '...'
  }
  return string
}

// Used to decide which error handling method to use when wrapping async
// handlers: try/catch, or `window.onerror`. When available, `window.onerror`
// will provide more information in modern browsers.
export const preferCatch = (function() {
  let preferCatch = true

  // In case we're in an environment without access to "window", lets make sure theres a window.
  if (typeof window === 'undefined') return preferCatch

  // IE < 10
  if (!window.atob) { preferCatch = false }

  // Modern browsers support the full ErrorEvent API
  // See https://developer.mozilla.org/en-US/docs/Web/API/ErrorEvent
  if (window.ErrorEvent) {
    try {
      if ((new window.ErrorEvent('')).colno === 0) {
        preferCatch = false
      }
      // eslint-disable-next-line no-empty
    } catch (_e) { }
  }
  return preferCatch
})()

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

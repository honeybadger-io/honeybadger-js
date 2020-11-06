/**
 * Converts an HTMLElement into a human-readable string.
 * @param {!HTMLElement} element
 * @return {string}
 */
export function stringNameOfElement(element: any): string {
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

export function nativeFetch() {
  if (!window.fetch) { return false }
  if (isNative(window.fetch)) { return true }

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

export function parseURL(url) {
  // Regexp: https://tools.ietf.org/html/rfc3986#appendix-B
  const match = url.match(/^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?$/) || {}

  return {
    protocol: match[2],
    host: match[4],
    pathname: match[5]
  }
}

export function localURLPathname(url) {
  const parsed = parseURL(url)
  const parsedDocURL = parseURL(document.URL)

  // URL must be relative
  if (!parsed.host || !parsed.protocol) { return parsed.pathname }

  // Same domain
  if (parsed.protocol === parsedDocURL.protocol && parsed.host === parsedDocURL.host) {
    return parsed.pathname
  }

  // x-domain
  return `${parsed.protocol}://${parsed.host}${parsed.pathname}`
}

export function encodeCookie(object) {
  if (typeof object !== 'object') {
    return undefined
  }

  const cookies = []
  for (var k in object) {
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
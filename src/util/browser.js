/**
 * Converts an HTMLElement into a human-readable string.
 * @param {!HTMLElement} element
 * @return {string}
 */
export function stringNameOfElement(element) {
  if (!element || !element.tagName) { return ''; }

  let name = element.tagName.toLowerCase();

  // Ignore the root <html> element in selectors and events.
  if (name === 'html') { return ''; }

  if (element.id) {
    name += `#${element.id}`;
  }

  const stringClassNames = element.getAttribute('class');
  if (stringClassNames) {
    stringClassNames.split(/\s+/).forEach(className => {
      name += `.${className}`;
    });
  }

  ['alt', 'name', 'title', 'type'].forEach(attrName => {
    let attr = element.getAttribute(attrName);
    if (attr) {
      name += `[${attrName}="${attr}"]`;
    }
  });

  const siblings = getSiblings(element);
  if (siblings.length > 1) {
    name += `:nth-child(${Array.prototype.indexOf.call(siblings, element) + 1})`;
  }

  return name;
}

export function stringSelectorOfElement(element) {
  const name = stringNameOfElement(element);

  if (element.parentNode && element.parentNode.tagName) {
    const parentName = stringSelectorOfElement(element.parentNode);
    if (parentName.length > 0) {
      return `${parentName} > ${name}`;
    }
  }

  return name;
}

export function stringTextOfElement(element) {
  return truncate((element.textContent || element.innerText || element.value || '').trim(), 300);
}

export function nativeFetch() {
  if (!window.fetch) { return false; }
  if (isNative(window.fetch)) { return true; }

  // If fetch isn't native, it may be wrapped by someone else. Try to get
  // a pristine function from an iframe.
  try {
    const sandbox = document.createElement('iframe');
    sandbox.style.display = 'none';
    document.head.appendChild(sandbox);
    const result = sandbox.contentWindow.fetch && isNative(sandbox.contentWindow.fetch);
    document.head.removeChild(sandbox);
    return result;
  } catch(err) {
    if (console && console.warn) {
      console.warn('failed to detect native fetch via iframe: ' + err);
    }
  }

  return false;
}

function isNative(func) {
  return func.toString().indexOf('native') !== -1;
}

export function parseURL(url) {
  // Regexp: https://tools.ietf.org/html/rfc3986#appendix-B
  const match = url.match(/^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?$/) || {};

  return {
    protocol: match[2],
    host: match[4],
    pathname: match[5],
  };
}

export function localURLPathname(url) {
  const parsed = parseURL(url);
  const parsedDocURL = parseURL(document.URL);

  // URL must be relative
  if (!parsed.host || parsed.protocol) { return parsed.pathname; }

  // Same domain
  if (parsed.protocol === parsedDocURL.protocol && parsed.host === parsedDocURL.host) {
    return parsed.pathname;
  }

  // x-domain
  return `${parsed.protocol}://${parsed.host}${parsed.pathname}`;
}


// Helpers

function getSiblings(element) {
  try {
    const nodes = element.parentNode.childNodes;
    const siblings = [];

    Array.prototype.forEach.call(nodes, node => {
      if (node.tagName && node.tagName === element.tagName) {
        siblings.push(node);
      }
    });

    return siblings;
  } catch(e) {
    return [];
  }
}

function truncate(string, length) {
  if (string.length > length) {
    string = string.substr(0, length) + '...';
  }
  return string;
}

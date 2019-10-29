/**
 * Converts an HTMLElement into a human-readable string.
 * @param {!HTMLElement} element
 * @return {string}
 */
export function stringNameOfElement(element) {
  if (!element || !element.tagName) return '';

  let name = element.tagName.toLowerCase();

  if (element.id) {
    name += `#${element.id}`;
  }

  return name;
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

// Thanks Cory! (https://www.abeautifulsite.net/parsing-urls-in-javascript)
export function parseURL(url) {
  let parser = document.createElement('a'),
    searchObject = {},
    queries, split, i;

  // Let the browser do the work
  parser.href = url;

  // Convert query string to object
  queries = parser.search.replace(/^\?/, '').split('&');
  for(i = 0; i < queries.length; i++) {
    split = queries[i].split('=');
    searchObject[split[0]] = split[1];
  }

  return {
    protocol: parser.protocol,
    host: parser.host,
    hostname: parser.hostname,
    port: parser.port,
    pathname: parser.pathname,
    search: parser.search,
    searchObject: searchObject,
    hash: parser.hash
  };
}

export function localURLPathname(url) {
  const parsed = parseURL(url);
  const parsedDocURL = parseURL(document.URL);

  if (parsed.protocol === parsedDocURL.protocol && parsed.host === parsedDocURL.host) {
    return parsed.pathname;
  }

  return `${parsed.protocol}://${parsed.host}${parsed.pathname}`;
}

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

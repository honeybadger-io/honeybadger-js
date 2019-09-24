/**
 * Converts an HTMLElement into a human-readable string.
 * @param {!HTMLElement} element
 * @return {string}
*/
export function stringNameOfElement(element) {
  if (!element || !element.tagName) return ''
  return element.tagName.toLowerCase()
}

/**
 * Converts an HTMLElement into a human-readable string.
 * @param {!HTMLElement} element
 * @return {string}
*/
export function stringNameOfElement(element) {
  if (!element || !element.tagName) return ''

  let name = element.tagName.toLowerCase()

  if (element.id) {
    name += `#${element.id}`
  }

  return name
}

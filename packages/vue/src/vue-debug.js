/**
 * This was originally taken from https://github.com/vuejs/vue/blob/master/src/core/util/debug.js.
 * The method generateStackTrace is used to log errors the same way as Vue logs them when errorHandler is not set.
 */

const classifyRE = /(?:^|[-_])(\w)/g
const classify = str => str
  .replace(classifyRE, c => c.toUpperCase())
  .replace(/[-_]/g, '')

const ANONYMOUS_COMPONENT = '<Anonymous>'
const ROOT_COMPONENT = '<Root>'

const formatComponentName = (vm, includeFile) => {
  if (!vm) {
    return ANONYMOUS_COMPONENT
  }

  if (vm.$root === vm) {
    return ROOT_COMPONENT
  }

  const options = vm.$options
  if (!options) {
    return ANONYMOUS_COMPONENT
  }

  let name = options.name || options._componentTag
  const file = options.__file
  if (!name && file) {
    const match = file.match(/([^/\\]+)\.vue$/)
    name = match && match[1]
  }

  return (
    (name ? `<${classify(name)}>` : ANONYMOUS_COMPONENT) +
    (file && includeFile !== false ? ` at ${file}` : '')
  )
}

const repeat = (str, n) => {
  let res = ''
  while (n) {
    if (n % 2 === 1) res += str
    if (n > 1) str += str
    n >>= 1
  }
  return res
}

export const generateComponentTrace = vm => {
  if (vm && (vm.__isVue || vm._isVue) && vm.$parent) {
    const tree = []
    let currentRecursiveSequence = 0
    while (vm) {
      if (tree.length > 0) {
        const last = tree[tree.length - 1]
        if (last.constructor === vm.constructor) {
          currentRecursiveSequence++
          vm = vm.$parent
          continue
        } else if (currentRecursiveSequence > 0) {
          tree[tree.length - 1] = [last, currentRecursiveSequence]
          currentRecursiveSequence = 0
        }
      }
      tree.push(vm)
      vm = vm.$parent
    }
    return '\n\nfound in\n\n' + tree
      .map((vm, i) => `${
        i === 0 ? '---> ' : repeat(' ', 5 + i * 2)
      }${
        Array.isArray(vm)
          ? `${formatComponentName(vm[0])}... (${vm[1]} recursive calls)`
          : formatComponentName(vm)
      }`)
      .join('\n')
  } else {
    return `\n\n(found in ${formatComponentName(vm)})`
  }
}

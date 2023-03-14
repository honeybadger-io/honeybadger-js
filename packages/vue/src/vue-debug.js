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

const formatComponentName = (vm, includeFile, isVue3Vm) => {
  if (!vm) {
    return ANONYMOUS_COMPONENT
  }

  // no need to check for root in vue3, better to show name of component, even if $root
  if (!isVue3Vm && vm.$root === vm) {
    return ROOT_COMPONENT
  }

  const options = vm.$options
  if (!options) {
    return ANONYMOUS_COMPONENT
  }

  // __name found in vue3
  let name = options.name || options._componentTag || options.__name
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

const isVue3Vm = vm => !!(vm && vm.__isVue)
const isVue2Vm = vm => !!(vm && vm._isVue)

export const generateComponentTrace = vm => {
  const vue3Vm = isVue3Vm(vm)
  if ((vue3Vm || isVue2Vm(vm)) && vm.$parent) {
    const tree = []
    let currentRecursiveSequence = 0
    while (vm) {
      if (!vue3Vm && tree.length > 0) {
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
          ? `${formatComponentName(vm[0], true, vue3Vm)}... (${vm[1]} recursive calls)`
          : formatComponentName(vm, true, vue3Vm)
      }`)
      .join('\n')
  } else {
    return `\n\n(found in ${formatComponentName(vm, true, vue3Vm)})`
  }
}

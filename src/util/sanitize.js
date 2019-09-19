export default function sanitize(obj, maxDepth) {
  let seenObjects = [];
  function seen(obj) {
    if (!obj || typeof(obj) !== 'object') { return false }
    for (let i = 0; i < seenObjects.length; i++) {
      const value = seenObjects[i];
      if (value === obj) {
        return true
      }
    }
    seenObjects.push(obj)
    return false
  }

  function canSerialize(obj) {
    // Functions are TMI and Symbols can't convert to strings.
    if (/function|symbol/.test(typeof(obj))) { return false }

    // No prototype, likely created with `Object.create(null)`.
    if (typeof obj === 'object' && typeof obj.hasOwnProperty === 'undefined') { return false }

    return true
  }

  function serialize(obj, depth) {
    if (!depth) { depth = 0; }
    if (depth >= maxDepth) {
      return '[MAX DEPTH REACHED]'
    }

    // Inspect invalid types
    if (!canSerialize(obj)) { return Object.prototype.toString.call(obj); }

    // Halt circular references
    if (seen(obj)) {
      return '[RECURSION]'
    }

    // Serialize inside arrays
    if (Array.isArray(obj)) {
      return obj.map(o => serialize(o, depth+1));
    }

    // Serialize inside objects
    if (typeof(obj) === 'object') {
      let ret = {};
      for (const k in obj) {
        const v = obj[k];
        if (Object.prototype.hasOwnProperty.call(obj, k) && (k != null) && (v != null)) {
          ret[k] = serialize(v, depth+1)
        }
      }
      return ret;
    }

    // Return everything else untouched
    return obj;
  }

  return serialize(obj)
}

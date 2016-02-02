helpers = {}
helpers.String = (obj, fallback) ->
    return String(fallback) if !obj? && fallback?
    return null if !obj?
    String(obj)
helpers.sanitize = (obj, seen = []) =>
  if obj instanceof Function
    return "[FUNC]"
  else if obj instanceof Object
    # Object equality is determined by reference which means this should pass
    # on unique objects with the same (or empty) values. {} != {}.
    if obj in seen
      return "[CIRCULAR DATA STRUCTURE]"

    seen.push(obj)
    if obj instanceof Array
      new_obj = []
      return (helpers.sanitize(v, seen) for v in obj)
    else
      new_obj = {}
      try
        for k,v of obj
          new_obj[k] = helpers.sanitize(v, seen)
      catch e
        return { error: "Honeybadger was unable to read this object: " + String(e) }
      return new_obj

  obj

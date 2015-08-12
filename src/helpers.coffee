helpers = {}
helpers.String = (obj, fallback) ->
    return String(fallback) if !obj? && fallback?
    return null if !obj?
    String(obj)

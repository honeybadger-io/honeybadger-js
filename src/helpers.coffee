helpers = {}
helpers.String = (obj, fallback) ->
    return String(fallback) if !obj? && fallback?
    return undefined if !obj?
    String(obj)


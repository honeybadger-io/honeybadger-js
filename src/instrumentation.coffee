((window, hb) ->
  # wrap always returns the same function so that callbacks can be removed via
  # removeEventListener.
  wrap = (fn) ->
    try
      return fn if typeof fn isnt 'function'
      return fn unless hb.configuration.onerror
      fn.___hb = hb.wrap(fn) unless fn.___hb
      return fn.___hb
    catch _e
      return fn

  instrument = (object, name, replacement) ->
    original = object[name]
    object[name] = replacement(original)

  instrumentTimer = (original) ->
    # See https://developer.mozilla.org/en-US/docs/Web/API/WindowTimers/setTimeout
    (func, delay) ->
      if func instanceof Function
        args = Array::slice.call(arguments, 2)
        func = wrap(func)
        original((->
          func.apply(null, args)
        ), delay)
      else
        original(func, delay)

  instrument(window, 'setTimeout', instrumentTimer)
  instrument(window, 'setInterval', instrumentTimer)

  for prop in [ 'AudioContext', 'EventTarget', 'MIDIPort', 'IDBRequest', 'AudioNode', 'AudioSourceNode', 'SVGElement', 'HTMLMediaElement', 'HTMLElement', 'XMLHttpRequestEventTarget', 'Document', 'TextTrackCue', 'CharacterData', 'DocumentFragment', 'SVGGraphicsElement', 'SVGTextContentElement', 'SVGTextPositioningElement', 'SVGAnimationElement', 'SVGGeometryElement', 'SVGGradientElement', 'SVGComponentTransferFunctionElement', 'Element', 'Node', 'Text' ]
    if prototype = window[prop] && window[prop].prototype
      instrument prototype, 'addEventListener', (original) ->
        # See https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
        (type, listener, useCapture, wantsUntrusted) ->
          if listener.handleEvent?
            listener.handleEvent = wrap(listener.handleEvent)
          original.call(this, type, wrap(listener), useCapture, wantsUntrusted)

      instrument prototype, 'removeEventListener', (original) ->
        (type, listener, useCapture, wantsUntrusted) ->
          original.call(this, type, listener, useCapture, wantsUntrusted)
          original.call(this, type, wrap(listener), useCapture, wantsUntrusted)

  instrument window, 'onerror', (original) ->
    # See https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onerror
    (msg, url, line, col, error) ->
      if hb.configuration.onerror and not currentNotice
        if line == 0 && msg =~ /Script error\.?/
          hb.log('Ignoring cross-domain script error. Use CORS to enable tracking of these types of errors.', msg, url, line, col, error)
        else
          hb.log('Error caught by window.onerror', msg, url, line, col, error)
          if msg and not error
            error = new Error(msg)
            error.name = 'window.onerror'
            # v8 stack format.
            error.stack = [ msg, '\n    at ? (', url or 'unknown', ':', line or 0, ':', col or 0, ')' ].join('')
          hb.notify(error) if error
      return original.apply(this, arguments) if original instanceof Function
      false

  return
)(window, Honeybadger)

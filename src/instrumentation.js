(function (window, hb) {
  if (!hb) {
    if (window.console) {
      console.log("Skipping JavaScript instrumentation: please load honeybadger.js first.");
    }
    return;
  }

  // wrap always returns the same function so that callbacks can be removed via
  // removeEventListener.
  function wrap(fn) {
    try {
      if (!hb.configuration.onerror) {
        return fn;
      }
      if (typeof fn !== 'function') {
        return fn;
      }
      if (!fn.___hb) {
        fn.___hb = hb.wrap(fn);
      }
      return fn.___hb;
    } catch(_e) {
      return fn;
    }
  }

  function instrument(object, name, replacement) {
    var original = object[name];
    object[name] = replacement(original);
  }

  var instrumentTimer = function(original) {
    // See https://developer.mozilla.org/en-US/docs/Web/API/WindowTimers/setTimeout
    return function(func, delay) {
      if (func instanceof Function) {
        var args = Array.prototype.slice.call(arguments, 2);
        func = wrap(func);
        return original(function() {
          func.apply(null, args);
        }, delay);
      } else {
        return original(func, delay);
      }
    }
  }
  instrument(window, 'setTimeout', instrumentTimer);
  instrument(window, 'setInterval', instrumentTimer);

  var props = ["AudioContext", "EventTarget", "MIDIPort", "IDBRequest", "AudioNode",
    "AudioSourceNode", "SVGElement", "HTMLMediaElement", "HTMLElement",
    "XMLHttpRequestEventTarget", "Document", "TextTrackCue", "CharacterData",
    "DocumentFragment", "SVGGraphicsElement", "SVGTextContentElement",
    "SVGTextPositioningElement", "SVGAnimationElement", "SVGGeometryElement",
    "SVGGradientElement", "SVGComponentTransferFunctionElement", "Element",
    "Node", "Text"];
  for (i = 0; i < props.length; ++i) {
    prop = props[i];
    if (prototype = window[prop] && window[prop].prototype) {
      instrument(prototype, 'addEventListener', function(original) {
        // See https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
        return function(type, listener, useCapture, wantsUntrusted) {
          return original.call(this, type, wrap(listener), useCapture, wantsUntrusted);
        };
      });
      instrument(prototype, 'removeEventListener', function(original) {
        return function(type, listener, useCapture, wantsUntrusted) {
          original.call(this, type, listener, useCapture, wantsUntrusted);
          return original.call(this, type, wrap(listener), useCapture, wantsUntrusted);
        };
      });
    }
  }

  instrument(window, 'onerror', function(original) {
    // See https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onerror
    return function(msg, url, line, col, error) {
      if (!currentNotice && hb.configuration.onerror) {
        hb.log('Error caught by window.onerror', msg, url, line, col, error);
        if (!error && msg) {
          error = new Error(msg);
          error.name = 'window.onerror'
          // v8 stack format.
          error.stack = [msg, '\n    at ? (', url || 'unknown', ':', line || 0, ':', col || 0, ')'].join('');
        }
        if (error) {
          hb.notify(error);
        }
      }
      if (original instanceof Function) {
        return original.apply(this, arguments);
      }
      return false;
    };
  });
})(window, window.Honeybadger);

(function(){
var _$honeybadger_1 = { exports: {} };
"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

(function (root, builder) {
  'use strict';

  var scriptConfig = {};

  (function () {
    var tags = document.getElementsByTagName("script");
    var tag = tags[tags.length - 1];

    if (!tag) {
      return;
    }

    var attrs = tag.attributes;
    var value;

    for (var i = 0, len = attrs.length; i < len; i++) {
      if (/data-(\w+)$/.test(attrs[i].nodeName)) {
        value = attrs[i].nodeValue;

        if (value === 'false') {
          value = false;
        }

        scriptConfig[RegExp.$1] = value;
      }
    }
  })();

  var factory = function factory() {
    var f = builder();
    var singleton = f(scriptConfig);
    singleton.factory = f;
    return singleton;
  };

  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (("object" === "undefined" ? "undefined" : _typeof(_$honeybadger_1)) === 'object' && _$honeybadger_1.exports) {
    _$honeybadger_1.exports = factory();
  } else {
    root.Honeybadger = factory();
  }
})(typeof self !== 'undefined' ? self : void 0, function () {
  var VERSION = '1.0.0-beta.0',
      NOTIFIER = {
    name: 'honeybadger.js',
    url: 'https://github.com/honeybadger-io/honeybadger-js',
    version: VERSION,
    language: 'javascript'
  };
  var loaded = false,
      installed = false;
  var currentErr, currentPayload;

  function merge(obj1, obj2) {
    var obj3 = {};

    for (var k in obj1) {
      obj3[k] = obj1[k];
    }

    for (var k in obj2) {
      obj3[k] = obj2[k];
    }

    return obj3;
  }

  function currentErrIs(err) {
    if (!currentErr) {
      return false;
    }

    if (currentErr.name !== err.name) {
      return false;
    }

    if (currentErr.message !== err.message) {
      return false;
    }

    if (currentErr.stack !== err.stack) {
      return false;
    }

    return true;
  }

  function isIgnored(err, patterns) {
    var msg = err.message;

    for (var p in patterns) {
      if (msg.match(patterns[p])) {
        return true;
      }
    }

    return false;
  }

  function cgiData() {
    var data = {};
    data['HTTP_USER_AGENT'] = navigator.userAgent;

    if (document.referrer.match(/\S/)) {
      data['HTTP_REFERER'] = document.referrer;
    }

    return data;
  }

  function encodeCookie(object) {
    if (_typeof(object) !== 'object') {
      return undefined;
    }

    var cookies = [];

    for (var k in object) {
      cookies.push(k + '=' + object[k]);
    }

    return cookies.join(';');
  }

  function stackTrace(err) {
    return err.stacktrace || err.stack || undefined;
  }

  function generateStackTrace(err) {
    var stack;
    var maxStackSize = 10;

    if (err && (stack = stackTrace(err))) {
      return {
        stack: stack,
        generator: undefined
      };
    }

    try {
      throw new Error('');
    } catch (e) {
      if (stack = stackTrace(e)) {
        return {
          stack: stack,
          generator: 'throw'
        };
      }
    }

    stack = ['<call-stack>'];
    var curr = arguments.callee;

    while (curr && stack.length < maxStackSize) {
      if (/function(?:\s+([\w$]+))+\s*\(/.test(curr.toString())) {
        stack.push(RegExp.$1 || '<anonymous>');
      } else {
        stack.push('<anonymous>');
      }

      try {
        curr = curr.caller;
      } catch (e) {
        break;
      }
    }

    return {
      stack: stack.join('\n'),
      generator: 'walk'
    };
  }

  function checkHandlers(handlers, err) {
    var handler, i, len;

    for (i = 0, len = handlers.length; i < len; i++) {
      handler = handlers[i];

      if (handler(err) === false) {
        return true;
      }
    }

    return false;
  }

  var factory = function factory(opts) {
    var notSingleton = installed;
    var defaultProps = [];
    var queue = [];
    var self = {
      context: {},
      beforeNotifyHandlers: [],
      errorsSent: 0
    };

    if (_typeof(opts) === 'object') {
      for (var k in opts) {
        self[k] = opts[k];
      }
    }

    function log() {
      var console = window.console;

      if (console) {
        var args = Array.prototype.slice.call(arguments);
        args.unshift('[Honeybadger]');
        console.log.apply(console, args);
      }
    }

    function debug() {
      if (config('debug')) {
        return log.apply(this, arguments);
      }
    }

    function config(key, fallback) {
      var value = self[key];

      if (value === undefined) {
        value = self[key.toLowerCase()];
      }

      if (value === 'false') {
        value = false;
      }

      if (value !== undefined) {
        return value;
      }

      return fallback;
    }

    function onErrorEnabled() {
      if (notSingleton) {
        return false;
      }

      return config('onerror', true);
    }

    function baseURL() {
      return 'http' + (config('ssl', true) && 's' || '') + '://' + config('host', 'api.honeybadger.io');
    }

    function canSerialize(obj) {
      if (/function|symbol/.test(_typeof(obj))) {
        return false;
      }

      if (_typeof(obj) === 'object' && typeof obj.hasOwnProperty === 'undefined') {
        return false;
      }

      return true;
    }

    function serialize(obj, depth) {
      var k, v, ret;
      ret = {};

      if (!depth) {
        depth = 0;
      }

      if (depth >= config('max_depth', 8)) {
        return '[MAX DEPTH REACHED]';
      }

      for (k in obj) {
        v = obj[k];

        if (Object.prototype.hasOwnProperty.call(obj, k) && k != null && v != null) {
          if (!canSerialize(v)) {
            v = Object.prototype.toString.call(v);
          }

          ret[k] = _typeof(v) === 'object' ? serialize(v, depth + 1) : v;
        }
      }

      return ret;
    }

    function request(apiKey, payload) {
      try {
        var x = new XMLHttpRequest();
        x.open('POST', baseURL() + '/v1/notices/js', config('async', true));
        x.setRequestHeader('X-API-Key', apiKey);
        x.setRequestHeader('Content-Type', 'application/json');
        x.setRequestHeader('Accept', 'text/json, application/json');
        x.send(JSON.stringify(serialize(payload)));
      } catch (err) {
        log('Unable to send error report: error while initializing request', err, payload);
      }
    }

    function send(payload) {
      currentErr = currentPayload = null;

      if (config('disabled', false)) {
        debug('Dropping notice: honeybadger.js is disabled', payload);
        return false;
      }

      var apiKey = config('apiKey', config('api_key'));

      if (!apiKey) {
        log('Unable to send error report: no API key has been configured');
        return false;
      }

      if (exceedsMaxErrors()) {
        debug('Dropping notice: max errors exceeded', payload);
        return false;
      }

      incrementErrorsCount();
      request(apiKey, payload);
      return true;
    }

    function notify(err, generated) {
      if (!err) {
        err = {};
      }

      if (Object.prototype.toString.call(err) === '[object Error]') {
        var e = err;
        err = merge(err, {
          name: e.name,
          message: e.message,
          stack: stackTrace(e)
        });
      }

      if (!(_typeof(err) === 'object')) {
        var m = String(err);
        err = {
          message: m
        };
      }

      if (currentErrIs(err)) {
        return false;
      } else if (currentPayload && loaded) {
        send(currentPayload);
      }

      if (function () {
        var k, results;
        results = [];

        for (k in err) {
          if (!Object.prototype.hasOwnProperty.call(err, k)) continue;
          results.push(k);
        }

        return results;
      }().length === 0) {
        return false;
      }

      if (generated) {
        err = merge(err, generated);
      }

      if (isIgnored(err, config('ignorePatterns'))) {
        return false;
      }

      if (checkHandlers(self.beforeNotifyHandlers, err)) {
        return false;
      }

      var data = cgiData();

      if (typeof err.cookies === 'string') {
        data['HTTP_COOKIE'] = err.cookies;
      } else if (_typeof(err.cookies) === 'object') {
        data['HTTP_COOKIE'] = encodeCookie(err.cookies);
      }

      var payload = {
        'notifier': NOTIFIER,
        'error': {
          'class': err.name || 'Error',
          'message': err.message,
          'backtrace': err.stack,
          'generator': err.generator,
          'fingerprint': err.fingerprint
        },
        'request': {
          'url': err.url || document.URL,
          'component': err.component || config('component'),
          'action': err.action || config('action'),
          'context': merge(self.context, err.context),
          'cgi_data': data,
          'params': err.params
        },
        'server': {
          'project_root': err.projectRoot || err.project_root || config('projectRoot', config('project_root', window.location.protocol + '//' + window.location.host)),
          'environment_name': err.environment || config('environment'),
          'revision': err.revision || config('revision')
        }
      };
      currentPayload = payload;
      currentErr = err;

      if (loaded) {
        debug('Deferring notice', err, payload);
        window.setTimeout(function () {
          if (currentErrIs(err)) {
            send(payload);
          }
        });
      } else {
        debug('Queuing notice', err, payload);
        queue.push(payload);
      }

      return err;
    }

    function objectIsExtensible(obj) {
      if (typeof Object.isExtensible !== 'function') {
        return true;
      }

      return Object.isExtensible(obj);
    }

    var preferCatch = true;

    if (!window.atob) {
      preferCatch = false;
    }

    if (window.ErrorEvent) {
      try {
        if (new window.ErrorEvent('').colno === 0) {
          preferCatch = false;
        }
      } catch (_e) {}
    }

    function wrap(fn, force) {
      try {
        if (typeof fn !== 'function') {
          return fn;
        }

        if (!objectIsExtensible(fn)) {
          return fn;
        }

        if (!fn.___hb) {
          fn.___hb = function () {
            var onerror = onErrorEnabled();

            if (preferCatch && (onerror || force) || force && !onerror) {
              try {
                return fn.apply(this, arguments);
              } catch (e) {
                notify(e);
                throw e;
              }
            } else {
              return fn.apply(this, arguments);
            }
          };
        }

        fn.___hb.___hb = fn.___hb;
        return fn.___hb;
      } catch (_e) {
        return fn;
      }
    }

    self.notify = function (err, name, extra) {
      if (!err) {
        err = {};
      }

      if (Object.prototype.toString.call(err) === '[object Error]') {
        var e = err;
        err = merge(err, {
          name: e.name,
          message: e.message,
          stack: stackTrace(e)
        });
      }

      if (!(_typeof(err) === 'object')) {
        var m = String(err);
        err = {
          message: m
        };
      }

      if (name && !(_typeof(name) === 'object')) {
        var n = String(name);
        name = {
          name: n
        };
      }

      if (name) {
        err = merge(err, name);
      }

      if (_typeof(extra) === 'object') {
        err = merge(err, extra);
      }

      return notify(err, generateStackTrace(err));
    };

    self.wrap = function (func) {
      return wrap(func, true);
    };

    self.setContext = function (context) {
      if (_typeof(context) === 'object') {
        self.context = merge(self.context, context);
      }

      return self;
    };

    self.resetContext = function (context) {
      if (_typeof(context) === 'object') {
        self.context = merge({}, context);
      } else {
        self.context = {};
      }

      return self;
    };

    self.configure = function (opts) {
      for (var k in opts) {
        self[k] = opts[k];
      }

      return self;
    };

    self.beforeNotify = function (handler) {
      self.beforeNotifyHandlers.push(handler);
      return self;
    };

    var indexOf = [].indexOf || function (item) {
      for (var i = 0, l = this.length; i < l; i++) {
        if (i in this && this[i] === item) return i;
      }

      return -1;
    };

    self.reset = function () {
      self.context = {};
      self.beforeNotifyHandlers = [];

      for (var k in self) {
        if (indexOf.call(defaultProps, k) == -1) {
          self[k] = undefined;
        }
      }

      self.resetMaxErrors();
      return self;
    };

    self.resetMaxErrors = function () {
      return self.errorsSent = 0;
    };

    self.getVersion = function () {
      return VERSION;
    };

    function instrument(object, name, replacement) {
      if (notSingleton) {
        return;
      }

      if (!object || !name || !replacement) {
        return;
      }

      var original = object[name];
      object[name] = replacement(original);
    }

    var instrumentTimer = function instrumentTimer(original) {
      return function (func, delay) {
        if (typeof func === 'function') {
          var args = Array.prototype.slice.call(arguments, 2);
          func = wrap(func);
          return original(function () {
            func.apply(null, args);
          }, delay);
        } else {
          return original(func, delay);
        }
      };
    };

    instrument(window, 'setTimeout', instrumentTimer);
    instrument(window, 'setInterval', instrumentTimer);
    'EventTarget Window Node ApplicationCache AudioTrackList ChannelMergerNode CryptoOperation EventSource FileReader HTMLUnknownElement IDBDatabase IDBRequest IDBTransaction KeyOperation MediaController MessagePort ModalWindow Notification SVGElementInstance Screen TextTrack TextTrackCue TextTrackList WebSocket WebSocketWorker Worker XMLHttpRequest XMLHttpRequestEventTarget XMLHttpRequestUpload'.replace(/\w+/g, function (prop) {
      var prototype = window[prop] && window[prop].prototype;

      if (prototype && prototype.hasOwnProperty && prototype.hasOwnProperty('addEventListener')) {
        instrument(prototype, 'addEventListener', function (original) {
          return function (type, listener, useCapture, wantsUntrusted) {
            try {
              if (listener && listener.handleEvent != null) {
                listener.handleEvent = wrap(listener.handleEvent);
              }
            } catch (e) {
              log(e);
            }

            return original.call(this, type, wrap(listener), useCapture, wantsUntrusted);
          };
        });
        instrument(prototype, 'removeEventListener', function (original) {
          return function (type, listener, useCapture, wantsUntrusted) {
            original.call(this, type, listener, useCapture, wantsUntrusted);
            return original.call(this, type, wrap(listener), useCapture, wantsUntrusted);
          };
        });
      }
    });
    instrument(window, 'onerror', function (original) {
      function onerror(msg, url, line, col, err) {
        debug('window.onerror callback invoked', arguments);

        if (currentErr) {
          return;
        }

        if (!onErrorEnabled()) {
          return;
        }

        if (line === 0 && /Script error\.?/.test(msg)) {
          log('Ignoring cross-domain script error: enable CORS to track these types of errors', arguments);
          return;
        }

        var stack = [msg, '\n    at ? (', url || 'unknown', ':', line || 0, ':', col || 0, ')'].join('');

        if (err) {
          var generated = {
            stack: stackTrace(err)
          };

          if (!generated.stack) {
            generated = {
              stack: stack
            };
          }

          notify(err, generated);
          return;
        }

        notify({
          name: 'window.onerror',
          message: msg,
          stack: stack
        });
      }

      return function (msg, url, line, col, err) {
        onerror(msg, url, line, col, err);

        if (typeof original === 'function' && config('_onerror_call_orig', true)) {
          return original.apply(this, arguments);
        }

        return false;
      };
    });

    function incrementErrorsCount() {
      return self.errorsSent++;
    }

    function exceedsMaxErrors() {
      var maxErrors = config('maxErrors');
      return maxErrors && self.errorsSent >= maxErrors;
    }

    installed = true;

    for (var k in self) {
      defaultProps.push(k);
    }

    debug('Initializing honeybadger.js ' + VERSION);

    if (/complete|interactive|loaded/.test(document.readyState)) {
      loaded = true;
      debug('honeybadger.js ' + VERSION + ' ready');
    } else {
      debug('Installing ready handler');

      var domReady = function domReady() {
        loaded = true;
        debug('honeybadger.js ' + VERSION + ' ready');
        var notice;

        while (notice = queue.pop()) {
          send(notice);
        }
      };

      if (document.addEventListener) {
        document.addEventListener('DOMContentLoaded', domReady, true);
      } else {
        window.attachEvent('onload', domReady);
      }
    }

    return self;
  };

  return factory;
});

_$honeybadger_1 = _$honeybadger_1.exports
}());
//# sourceMappingURL=honeybadger.js.map

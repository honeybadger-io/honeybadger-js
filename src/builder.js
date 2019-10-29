import sanitize from './util/sanitize.js';
import { stringNameOfElement, nativeFetch, localURLPathname } from './util/browser.js';

export default function builder() {
  var VERSION = '__VERSION__',
      NOTIFIER = {
        name: 'honeybadger-js',
        url: 'https://github.com/honeybadger-io/honeybadger-js',
        version: VERSION,
        language: 'javascript'
      };

  // Used to control initial setup across clients.
  var loaded = false,
      installed = false;

  // Used to prevent reporting duplicate errors across instances.
  var currentErr,
      currentPayload;

  // Utilities.
  function merge(obj1, obj2) {
    var obj3 = {};
    for (var k in obj1) { obj3[k] = obj1[k]; }
    for (var k in obj2) { obj3[k] = obj2[k]; }
    return obj3;
  }

  function mergeErr(err1, err2) {
    let ret = merge(err1, err2);

    if (err1.context && err2.context) {
      ret.context = merge(err1.context, err2.context);
    }

    return ret;
  }

  function currentErrIs(err) {
    if (!currentErr) { return false; }
    if (currentErr.name !== err.name) { return false; }
    if (currentErr.message !== err.message) { return false; }
    if (currentErr.stack !== err.stack) { return false; }
    return true;
  }

  function isIgnored(err, patterns) {
    var msg = err.message;

    for (var p in patterns) {
      if (msg.match(patterns[p])) { return true; }
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
    if (typeof object !== 'object') {
      return undefined;
    }

    var cookies = [];
    for (var k in object) {
      cookies.push(k + '=' + object[k]);
    }

    return cookies.join(';');
  }

  function stackTrace(err) {
    // From TraceKit: Opera 10 *destroys* its stacktrace property if you try to
    // access the stack property first.
    return err.stacktrace || err.stack || undefined;
  }

  function generateStackTrace(err) {
    var stack;
    var maxStackSize = 10;

    if (err && (stack = stackTrace(err))) {
      return {stack: stack, generator: undefined};
    }

    try {
      throw new Error('');
    } catch(e) {
      if (stack = stackTrace(e)) {
        return {stack: stack, generator: 'throw'};
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

    return {stack: stack.join('\n'), generator: 'walk'};
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

  function objectIsEmpty(obj) {
    for (let k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        return false;
      }
    }
    return true;
  }

  function objectIsExtensible(obj) {
    if (typeof Object.isExtensible !== 'function') { return true; }
    return Object.isExtensible(obj);
  }

  // Client factory.
  var factory = (function(opts) {
    var notSingleton = installed;
    var defaultProps = [];
    var queue = [];
    var self = {
      context: {},
      beforeNotifyHandlers: [],
      breadcrumbs: [],
      errorsSent: 0,
    };
    if (typeof opts === 'object') {
      for (var k in opts) { self[k] = opts[k]; }
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
      if (value === undefined) { value = self[key.toLowerCase()]; }
      if (value === 'false') { value = false; }
      if (value !== undefined) { return value; }
      return fallback;
    }

    function onErrorEnabled() {
      if (notSingleton) { return false; }
      return config('onerror', true);
    }

    function onUnhandledRejectionEnabled() {
      if (notSingleton) { return false; }
      return config('onunhandledrejection', true);
    }

    function breadcrumbsEnabled() {
      return config('breadcrumbsEnabled', false);
    }

    function baseURL() {
      return 'http' + ((config('ssl', true) && 's') || '') + '://' + config('host', 'api.honeybadger.io');
    }

    function request(apiKey, payload) {
      try {
        var x = new XMLHttpRequest();
        x.open('POST', baseURL() + '/v1/notices/js', config('async', true));

        x.setRequestHeader('X-API-Key', apiKey);
        x.setRequestHeader('Content-Type', 'application/json');
        x.setRequestHeader('Accept', 'text/json, application/json');

        x.send(JSON.stringify(sanitize(payload, config('max_depth', 8))));
      } catch(err) {
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
      if (!err) { err = {}; }

      if (Object.prototype.toString.call(err) === '[object Error]') {
        var e = err;
        err = merge(err, {name: e.name, message: e.message, stack: stackTrace(e)});
      }

      if (!(typeof err === 'object')) {
        var m = String(err);
        err = {message: m};
      }

      if (currentErrIs(err)) {
        // Skip the duplicate error.
        return false;
      } else if (currentPayload && loaded) {
        // This is a different error, send the old one now.
        send(currentPayload);
      }

      if (objectIsEmpty(err)) { return false; }

      let generator;
      if (generated) {
        err.stack = generated.stack;
        generator = generated.generator;
      }

      err = merge(err, {
        name: err.name || 'Error',
        context: merge(self.context, err.context),
        url: err.url || document.URL,
        projectRoot: err.projectRoot || err.project_root || config('projectRoot', config('project_root', window.location.protocol + '//' + window.location.host)),
        environment: err.environment || config('environment'),
        component: err.component || config('component'),
        action: err.action || config('action'),
        revision: err.revision || config('revision')
      });

      self.addBreadcrumb('Honeybadger Notice', {
        category: 'notice',
        metadata: {
          message: err.message,
          name: err.name,
          stack: err.stack
        }
      });

      err.breadcrumbs = self.breadcrumbs.slice();

      let stack_before_handlers = err.stack;
      if (checkHandlers(self.beforeNotifyHandlers, err)) { return false; }
      if (err.stack != stack_before_handlers) {
        // Stack changed, so it's not generated.
        generator = undefined;
      }

      if (isIgnored(err, config('ignorePatterns'))) { return false; }

      var data = cgiData();
      if (typeof err.cookies === 'string') {
        data['HTTP_COOKIE'] = err.cookies;
      } else if (typeof err.cookies === 'object') {
        data['HTTP_COOKIE'] = encodeCookie(err.cookies);
      }

      var payload = {
        'notifier': NOTIFIER,
        'breadcrumbs': {
          'enabled': breadcrumbsEnabled(),
          'trail': err.breadcrumbs,
        },
        'error': {
          'class': err.name,
          'message': err.message,
          'backtrace': err.stack,
          'generator': generator,
          'fingerprint': err.fingerprint
        },
        'request': {
          'url': err.url,
          'component': err.component,
          'action': err.action,
          'context': err.context,
          'cgi_data': data,
          'params': err.params
        },
        'server': {
          'project_root': err.projectRoot,
          'environment_name': err.environment,
          'revision': err.revision
        }
      };

      currentPayload = payload;
      currentErr = err;

      if (loaded) {
        debug('Deferring notice', err, payload);
        window.setTimeout(function(){
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

    var preferCatch = true;
    // IE < 10
    if (!window.atob) { preferCatch = false; }
    // See https://developer.mozilla.org/en-US/docs/Web/API/ErrorEvent
    if (window.ErrorEvent) {
      try {
        if ((new window.ErrorEvent('')).colno === 0) {
          preferCatch = false;
        }
      } catch(_e) {}
    }

    // wrap always returns the same function so that callbacks can be removed via
    // removeEventListener.
    function wrap(fn, opts) {
      if (!opts) { opts = {}; }
      try {
        if (typeof fn !== 'function') { return fn; }
        if (!objectIsExtensible(fn))  { return fn; }
        if (!fn.___hb) {
          fn.___hb = function() {
            var onerror = onErrorEnabled();
            // Don't catch if the browser is old or supports the new error
            // object and there is a window.onerror handler available instead.
            if ((preferCatch && (onerror || opts.force)) || (opts.force && !onerror)) {
              try {
                return fn.apply(this, arguments);
              } catch (err) {
                let generated = { stack: stackTrace(err) };
                self.addBreadcrumb(
                  opts.component ? `${opts.component}: ${err.name}` : err.name,
                  {
                    category: 'error',
                    metadata: {
                      message: err.message,
                      name: err.name,
                      stack: generated.stack
                    }
                  }
                );
                notify(err, generated);
                throw(err);
              }
            } else {
              return fn.apply(this, arguments);
            }
          };
        }
        fn.___hb.___hb = fn.___hb;
        return fn.___hb;
      } catch(_e) {
        return fn;
      }
    }

    // Public API.
    self.notify = function(err, name, extra) {
      if (!err) { err = {}; }

      if (Object.prototype.toString.call(err) === '[object Error]') {
        var e = err;
        err = merge(err, {name: e.name, message: e.message, stack: stackTrace(e)});
      }

      if (!(typeof err === 'object')) {
        var m = String(err);
        err = {message: m};
      }

      if (name && !(typeof name === 'object')) {
        var n = String(name);
        name = {name: n};
      }

      if (name) {
        err = mergeErr(err, name);
      }
      if (typeof extra === 'object') {
        err = mergeErr(err, extra);
      }

      return notify(err, generateStackTrace(err));
    };

    self.wrap = function(func) {
      return wrap(func, { force: true });
    };

    self.setContext = function(context) {
      if (typeof context === 'object') {
        self.context = merge(self.context, context);
      }
      return self;
    };

    self.resetContext = function(context) {
      if (typeof context === 'object') {
        self.context = merge({}, context);
      } else {
        self.context = {};
      }
      return self;
    };

    self.configure = function(opts) {
      for (var k in opts) {
        self[k] = opts[k];
      }
      return self;
    };

    self.beforeNotify = function(handler) {
      self.beforeNotifyHandlers.push(handler);
      return self;
    };

    var indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };
    self.reset = function() {
      self.context = {};
      self.beforeNotifyHandlers = [];
      self.breadcrumbs = [];
      for (var k in self) {
        if (indexOf.call(defaultProps, k) == -1) {
          self[k] = undefined;
        }
      }
      self.resetMaxErrors();
      return self;
    };

    self.resetMaxErrors = function() {
      return (self.errorsSent=0);
    };

    self.getVersion = function() {
      return VERSION;
    };

    self.addBreadcrumb = function(message, opts) {
      if (!breadcrumbsEnabled()) return;

      opts = opts || {};

      const metadata = opts.metadata || undefined;
      const category = opts.category || 'custom';
      const timestamp = new Date().toISOString();

      self.breadcrumbs.push({
        category: category,
        message: message,
        metadata: metadata || {},
        timestamp: timestamp,
      });

      const limit = config('maxBreadcrumbs', 40);
      if (self.breadcrumbs.length > limit) {
        self.breadcrumbs = self.breadcrumbs.slice(self.breadcrumbs.length - limit);
      }

      return self;
    };

    // Install instrumentation.
    // This should happen once for the first factory call.
    function instrument(object, name, replacement) {
      if (notSingleton) { return; }
      if (!object || !name || !replacement || !(name in object)) { return; }
      var original = object[name];
      object[name] = replacement(original);
    }

    // Breadcrumbs: instrument click events
    (function() {
      window.addEventListener('click', (event) => {
        let message;
        try {
          message = stringNameOfElement(event.target);
        } catch(e) {
          message = '[unknown]';
        }

        if (message.length === 0) return;

        self.addBreadcrumb(message, {
          category: 'ui.click',
        });
      }, true);
    })();

    // Breadcrumbs: instrument XMLHttpRequest
    (function() {
      // -- On xhr.open: capture initial metadata
      instrument(XMLHttpRequest.prototype, 'open', function(original) {
        return function() {
          const xhr = this;
          const url = arguments[1];
          const method = typeof arguments[0] === 'string' ? arguments[0].toUpperCase() : arguments[0];
          const message = `${method} ${localURLPathname(url)}`;

          this.__hb_xhr = {
            type: 'xhr',
            method,
            url,
            message,
          };

          if (typeof original === 'function') {
            original.apply(xhr, arguments);
          }
        };
      });

      // -- On xhr.send: set up xhr.onreadystatechange to report breadcrumb
      instrument(XMLHttpRequest.prototype, 'send', function(original) {
        return function() {
          const xhr = this;

          function onreadystatechangeHandler() {
            if (xhr.readyState === 4) {
              let message;

              if (xhr.__hb_xhr) {
                xhr.__hb_xhr.status_code = xhr.status;
                message = xhr.__hb_xhr.message;
                delete xhr.__hb_xhr.message;
              }

              self.addBreadcrumb(message || 'XMLHttpRequest', {
                category: 'request',
                metadata: xhr.__hb_xhr,
              });
            }
          }

          if ('onreadystatechange' in xhr && typeof xhr.onreadystatechange === 'function') {
            instrument(xhr, 'onreadystatechange', function(original) {
              return function() {
                onreadystatechangeHandler();

                if (typeof original === 'function') {
                  original.apply(this, arguments);
                }
              };
            });
          } else {
            xhr.onreadystatechange = onreadystatechangeHandler;
          }

          if (typeof original === 'function') {
            original.apply(xhr, arguments);
          }
        };
      });
    })();

    // Breadcrumbs: instrument fetch
    (function() {
      if (!nativeFetch()) {
        // Polyfills use XHR.
        return;
      }

      instrument(window, 'fetch', function(original) {
        return function() {
          const input = arguments[0];

          let method = 'GET';
          let url;

          if (typeof input === 'string') {
            url = input;
          } else if ('Request' in window && input instanceof Request) {
            url = input.url;
            if (input.method) {
              method = input.method;
            }
          } else {
            url = String(input);
          }

          if (arguments[1] && arguments[1].method) {
            method = arguments[1].method;
          }

          if (typeof method === 'string') {
            method = method.toUpperCase();
          }

          const message = `${method} ${localURLPathname(url)}`;
          const metadata = {
            type: 'fetch',
            method,
            url,
          };

          return original
            .apply(this, arguments)
            .then(function(response) {
              metadata.status_code = response.status;
              self.addBreadcrumb(message, {
                category: 'request',
                metadata,
              });
              return response;
            })
            .catch(function(error) {
              self.addBreadcrumb('fetch error', {
                category: 'error',
                metadata,
              });

              throw error;
            });
        };
      });
    })();

    // Breadcrumbs: instrument navigation
    (function() {
      // The last known href of the current page
      let lastHref = window.location.href;

      function recordUrlChange(from, to) {
        lastHref = to;
        self.addBreadcrumb('Page changed', {
          category: 'navigation',
          metadata: {
            from,
            to,
          },
        });
      }

      // https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onpopstate
      instrument(window, 'onpopstate', function(original) {
        return function() {
          recordUrlChange(lastHref, window.location.href);
          if (original) {
            return original.apply(this, arguments);
          }
        };
      });

      // https://developer.mozilla.org/en-US/docs/Web/API/History/pushState
      // https://developer.mozilla.org/en-US/docs/Web/API/History/replaceState
      function historyWrapper(original) {
        return function() {
          const url = arguments.length > 2 ? arguments[2] : undefined;
          if (url) {
            recordUrlChange(lastHref, String(url));
          }
          return original.apply(this, arguments);
        };
      }
      instrument(window.history, 'pushState', historyWrapper);
      instrument(window.history, 'replaceState', historyWrapper);
    })();

    // Breadcrumbs: instrument console
    (function() {
      function inspectArray(obj) {
        if (!Array.isArray(obj)) { return ''; }

        return obj.map(value => {
          try {
            return String(value);
          } catch (e) {
            return '[UNKNOWN VALUE]';
          }
        }).join(' ');
      }

      ['debug', 'info', 'warn', 'error', 'log'].forEach(level => {
        instrument(window.console, level, function(original) {
          return function() {
            const args = Array.prototype.slice.call(arguments);
            const message = inspectArray(args);
            const opts = {
              category: 'log',
              metadata: {
                level: level,
                arguments: sanitize(args, 3),
              },
            };

            self.addBreadcrumb(message, opts);

            if (typeof original === 'function') {
              Function.prototype.apply.call(original, window.console, arguments);
            }
          };
        });
      });
    })();

    // Wrap timers
    (function() {
      function instrumentTimer(wrapOpts) {
        return function(original) {
          // See https://developer.mozilla.org/en-US/docs/Web/API/WindowTimers/setTimeout
          return function(func, delay) {
            if (typeof func === 'function') {
              var args = Array.prototype.slice.call(arguments, 2);
              func = wrap(func, wrapOpts);
              return original(function() {
                func.apply(null, args);
              }, delay);
            } else {
              return original(func, delay);
            }
          };
        };
      };
      instrument(window, 'setTimeout', instrumentTimer({ component: 'setTimeout' }));
      instrument(window, 'setInterval', instrumentTimer({ component: 'setInterval' }));
    })();

    // Wrap event listeners
    // Event targets borrowed from bugsnag-js:
    // See https://github.com/bugsnag/bugsnag-js/blob/d55af916a4d3c7757f979d887f9533fe1a04cc93/src/bugsnag.js#L542
    'EventTarget Window Node ApplicationCache AudioTrackList ChannelMergerNode CryptoOperation EventSource FileReader HTMLUnknownElement IDBDatabase IDBRequest IDBTransaction KeyOperation MediaController MessagePort ModalWindow Notification SVGElementInstance Screen TextTrack TextTrackCue TextTrackList WebSocket WebSocketWorker Worker XMLHttpRequest XMLHttpRequestEventTarget XMLHttpRequestUpload'.replace(/\w+/g, function (prop) {
      var prototype = window[prop] && window[prop].prototype;
      if (prototype && prototype.hasOwnProperty && prototype.hasOwnProperty('addEventListener')) {
        instrument(prototype, 'addEventListener', function(original) {
          const wrapOpts = {component: `${prop}.prototype.addEventListener`};

          // See https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
          return function(type, listener, useCapture, wantsUntrusted) {
            try {
              if (listener && listener.handleEvent != null) {
                listener.handleEvent = wrap(listener.handleEvent, wrapOpts);
              }
            } catch(e) {
              // Ignore 'Permission denied to access property "handleEvent"' errors.
              log(e);
            }
            return original.call(this, type, wrap(listener, wrapOpts), useCapture, wantsUntrusted);
          };
        });
        instrument(prototype, 'removeEventListener', function(original) {
          return function(type, listener, useCapture, wantsUntrusted) {
            original.call(this, type, listener, useCapture, wantsUntrusted);
            return original.call(this, type, wrap(listener), useCapture, wantsUntrusted);
          };
        });
      }
    });

    // Wrap window.onerror
    instrument(window, 'onerror', function(original) {
      function onerror(msg, url, line, col, err) {
        debug('window.onerror callback invoked', arguments);

        // Skip if the error is already being sent.
        if (currentErr) { return; }

        if (!onErrorEnabled()) { return; }

        if (line === 0 && /Script error\.?/.test(msg)) {
          // See https://developer.mozilla.org/en/docs/Web/API/GlobalEventHandlers/onerror#Notes
          log('Ignoring cross-domain script error: enable CORS to track these types of errors', arguments);
          return;
        }

        // Simulate v8 stack
        const simulatedStack = [msg, '\n    at ? (', url || 'unknown', ':', line || 0, ':', col || 0, ')'].join('');

        let generated;
        if (err) {
          generated = { stack: stackTrace(err) };
          if (!generated.stack) { generated = {stack: simulatedStack}; }
        } else {
          // Important: leave `generated` undefined
          err = {
            name: 'window.onerror',
            message: msg,
            stack: simulatedStack
          };
        }

        self.addBreadcrumb(
          (err.name === 'window.onerror' || !err.name) ? 'window.onerror' : `window.onerror: ${err.name}`,
          {
            category: 'error',
            metadata: {
              message: err.message,
              name: err.name,
              stack: generated ? generated.stack : err.stack
            }
          }
        );

        notify(err, generated);
      }
      // See https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onerror
      return function(msg, url, line, col, err) {
        onerror(msg, url, line, col, err);
        if (typeof original === 'function' && config('_onerror_call_orig', true)) {
          return original.apply(this, arguments);
        }
        return false;
      };
    });

    // Wrap window.onunhandledrejection
    instrument(window, 'onunhandledrejection', function(original) {
      // See https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event
      function onunhandledrejection(promiseRejectionEvent) {
        debug('window.onunhandledrejection callback invoked', arguments);

        // Skip if the error is already being sent.
        if (currentErr) { return; }

        if (!onUnhandledRejectionEnabled()) { return; }

        let { reason } = promiseRejectionEvent;

        if (reason instanceof Error) {
          // simulate v8 stack
          let fileName = reason.fileName || 'unknown';
          let lineNumber = reason.lineNumber || 0;
          let stackFallback = `${reason.message}\n    at ? (${fileName}:${lineNumber})`;
          let stack = stackTrace(reason) || stackFallback;
          let err = {
            name: reason.name,
            message: `UnhandledPromiseRejectionWarning: ${reason}`,
            stack
          };
          self.addBreadcrumb(
            `window.onunhandledrejection: ${err.name}`,
            {
              category: 'error',
              metadata: err
            }
          );
          notify(err);
          return;
        }

        let message = typeof reason === 'string' ? reason : JSON.stringify(reason);
        notify({
          name: 'window.onunhandledrejection',
          message: `UnhandledPromiseRejectionWarning: ${message}`,
        });
      }

      return function(promiseRejectionEvent) {
        onunhandledrejection(promiseRejectionEvent);
        if (typeof original === 'function') {
          original.apply(this, arguments);
        }
      };
    });

    function incrementErrorsCount() {
      return self.errorsSent++;
    }

    function exceedsMaxErrors() {
      var maxErrors = config('maxErrors');
      return maxErrors && self.errorsSent >= maxErrors;
    }

    // End of instrumentation.
    installed = true;

    // Save original state for reset()
    for (var k in self) {
      defaultProps.push(k);
    }

    // Initialization.
    debug('Initializing honeybadger.js ' + VERSION);

    // See https://developer.mozilla.org/en-US/docs/Web/API/Document/readyState
    // https://www.w3.org/TR/html5/dom.html#dom-document-readystate
    // The 'loaded' state is for older versions of Safari.
    if (/complete|interactive|loaded/.test(document.readyState)) {
      loaded = true;
      debug('honeybadger.js ' + VERSION + ' ready');
    } else {
      debug('Installing ready handler');
      var domReady = function() {
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
  });

  return factory;
}

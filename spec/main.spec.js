import Honeybadger from '..'

const url = 'global';

describe('Honeybadger', function() {
  var requests, request, xhr;

  beforeEach(function() {
    // Refresh singleton state.
    Honeybadger.reset();

    // Configure the global window.onerror handler not to call the original
    // because calling Jasmine/Puppeteer's global error handler causes issues.
    // Would be nice to find a better way to test our global instrumentation.
    Honeybadger.configure({
      _onerror_call_orig: false
    });

    // Stub HTTP requests.
    request = undefined;
    requests = [];
    xhr = sinon.useFakeXMLHttpRequest();
    xhr.onCreate = function(xhr) {
      request = xhr;
      return requests.push(xhr);
    };
  });

  afterEach(function() {
    xhr.restore();
  });

  function afterNotify(done, run) {
    setTimeout(function() {
      for(var i=0; i<requests.length; i++) {
        requests[i].payload = JSON.parse(requests[i].requestBody);
      }
      run();
      done();
    }, 50);
  }

  describe('.configure', function() {
    it('configures Honeybadger', function() {
      expect(Honeybadger.configure).toBeDefined();

      Honeybadger.configure({
        api_key: 'asdf'
      });

      expect(Honeybadger.api_key).toEqual('asdf');
    });

    it('is chainable', function() {
      expect(Honeybadger.configure({})).toBe(Honeybadger);
    });
  });

  it('has a context object', function() {
    expect(Honeybadger.context).toBeDefined();
  });

  describe('.setContext', function() {
    it('merges existing context', function() {
      Honeybadger.setContext({
        user_id: '1'
      }).setContext({
        foo: 'bar'
      });

      expect(Honeybadger.context.user_id).toBeDefined();
      expect(Honeybadger.context['user_id']).toEqual('1');
      expect(Honeybadger.context.foo).toBeDefined();
      expect(Honeybadger.context['foo']).toEqual('bar');
    });

    it('is chainable', function() {
      expect(Honeybadger.setContext({
        user_id: 1
      })).toBe(Honeybadger);
    });

    it('does not accept non-objects', function() {
      Honeybadger.setContext('foo');
      expect(Honeybadger.context).toEqual({});
    });

    it('keeps previous context when called with non-object', function() {
      Honeybadger.setContext({
        foo: 'bar'
      }).setContext(false);

      expect(Honeybadger.context).toEqual({
        foo: 'bar'
      });
    });
  });

  describe('.resetContext', function() {
    it('empties the context with no arguments', function() {
      Honeybadger.setContext({
        user_id: '1'
      }).resetContext();

      expect(Honeybadger.context).toEqual({});
    });

    it('replaces the context with arguments', function() {
      Honeybadger.setContext({
        user_id: '1'
      }).resetContext({
        foo: 'bar'
      });

      expect(Honeybadger.context).toEqual({
        foo: 'bar'
      });
    });

    it('empties the context with non-object argument', function() {
      Honeybadger.setContext({
        foo: 'bar'
      }).resetContext('foo');

      expect(Honeybadger.context).toEqual({});
    });

    it('is chainable', function() {
      expect(Honeybadger.resetContext()).toBe(Honeybadger);
    });
  });

  it('responds to notify', function() {
    expect(Honeybadger.notify).toBeDefined();
  });

  describe('.notify', function() {
    it('delivers the notice when configured', function(done) {
      Honeybadger.configure({
        apiKey: 'asdf'
      });

      try {
        throw new Error("Testing");
      } catch (e) {
        Honeybadger.notify(e);
      }

      afterNotify(done, function() {
        expect(requests.length).toEqual(1);
      });
    });

    it('delivers the notice when configured with lower case api key', function(done) {
      Honeybadger.configure({
        apikey: 'asdf'
      });

      try {
        throw new Error("Testing");
      } catch (e) {
        Honeybadger.notify(e);
      }

      afterNotify(done, function() {
        expect(requests.length).toEqual(1);
      });
    });

    it('delivers the notice when configured with snake case api key', function(done) {
      Honeybadger.configure({
        api_key: 'asdf'
      });

      try {
        throw new Error("Testing");
      } catch (e) {
        Honeybadger.notify(e);
      }

      afterNotify(done, function() {
        expect(requests.length).toEqual(1);
      });
    });

    it('does not deliver notice when not configured', function(done) {
      try {
        throw new Error("Testing");
      } catch (e) {
        Honeybadger.notify(e);
      }

      afterNotify(done, function() {
        expect(requests.length).toEqual(0);
      });
    });

    it('does not deliver notice when disabled', function(done) {
      Honeybadger.configure({
        api_key: 'asdf',
        disabled: true
      });

      try {
        throw new Error("Testing");
      } catch (e) {
        Honeybadger.notify(e);
      }

      afterNotify(done, function() {
        expect(requests.length).toEqual(0);
      });
    });

    it('does not deliver notice without arguments', function(done) {
      Honeybadger.configure({
        api_key: 'asdf'
      });

      Honeybadger.notify();
      Honeybadger.notify(null);
      Honeybadger.notify(null, {});
      Honeybadger.notify({});

      afterNotify(done, function() {
        expect(requests.length).toEqual(0);
      });
    });

    it('does not deliver notice for ignored message', function(done) {
      Honeybadger.configure({
        api_key: 'asdf',
        ignorePatterns: [/care/i]
      });

      var notice = Honeybadger.notify("Honeybadger don't care, but you might.");

      afterNotify(done, function() {
        expect(requests.length).toEqual(0);
      });
    });

    it('has unlimited errors as its default', function(done) {
      Honeybadger.configure({
        api_key: 'asdf'
      });

      for(var i=0; i<3; i++) {
        try {
          throw new Error("Testing " + (i+1));
        } catch (e) {
          Honeybadger.notify(e);
        }
      }

      afterNotify(done, function() {
        expect(requests.length).toEqual(3);
      });
    });

    it('resets count for error limit', function(done) {
      Honeybadger.configure({
        api_key: 'asdf',
        maxErrors: 2
      });

      for(var i=0; i<3; i++) {
        try {
          throw new Error("Testing " + (i+1));
        } catch (e) {
          Honeybadger.notify(e);
        }
      }

      Honeybadger.resetMaxErrors();

      for(var i=0; i<3; i++) {
        try {
          throw new Error("Testing " + (i+1));
        } catch (e) {
          Honeybadger.notify(e);
        }
      }

      afterNotify(done, function() {
        expect(requests.length).toEqual(4);
      });
    });

    it('does not exceed sending more than the established errors limit', function(done) {
      Honeybadger.configure({
        api_key: 'asdf',
        maxErrors: 2
      });

      for(var i=0; i<3; i++) {
        try {
          throw new Error("Testing " + (i+1));
        } catch (e) {
          Honeybadger.notify(e);
        }
      }

      afterNotify(done, function() {
        expect(requests.length).toEqual(2);
      });
    });

    it('generates a stack trace without an error', function(done) {
      Honeybadger.configure({
        api_key: 'asdf'
      });

      var notice = Honeybadger.notify("Honeybadger don't care, but you might.");

      expect(notice.stack).toEqual(jasmine.any(String));
      expect(notice.generator).toEqual(jasmine.any(String));
      expect(notice.message).toEqual("Honeybadger don't care, but you might.");
      afterNotify(done, function() {
        expect(requests.length).toEqual(1);
      });
    });

    it('accepts options as first argument', function(done) {
      Honeybadger.configure({
        api_key: 'asdf'
      });

      try {
        throw new Error('expected message');
      } catch (e) {
        Honeybadger.notify({
          error: e
        });
      }

      afterNotify(done, function() {
        expect(requests.length).toEqual(1);
      });
    });

    it('accepts name as second argument', function(done) {
      Honeybadger.configure({
        api_key: 'asdf'
      });

      try {
        throw new Error('expected message');
      } catch (e) {
        Honeybadger.notify(e, 'expected name');
      }

      afterNotify(done, function() {
        expect(requests.length).toEqual(1);
        expect(request.payload.error.message).toEqual('expected message');
        expect(request.payload.error.class).toEqual('expected name');
      });
    });

    it('accepts options as second argument', function(done) {
      Honeybadger.configure({
        api_key: 'asdf'
      });

      try {
        throw new Error('original message');
      } catch (e) {
        Honeybadger.notify(e, {
          message: 'expected message'
        });
      }

      afterNotify(done, function() {
        expect(requests.length).toEqual(1);
        expect(request.payload.error.message).toEqual('expected message');
      });
    });

    it('accepts options as third argument', function(done) {
      Honeybadger.configure({
        api_key: 'asdf'
      });

      try {
        throw new Error('original message');
      } catch (e) {
        Honeybadger.notify(e, 'expected name', {
          message: 'expected message'
        });
      }

      afterNotify(done, function() {
        expect(requests.length).toEqual(1);
        expect(request.payload.error.class).toEqual('expected name');
        expect(request.payload.error.message).toEqual('expected message');
      });
    });

    it('sends params', function(done) {
      Honeybadger.configure({
        api_key: 'asdf'
      });

      Honeybadger.notify("testing", {
        params: {
          foo: 'bar'
        }
      });

      afterNotify(done, function() {
        expect(requests.length).toEqual(1);
        expect(request.payload.request.params.foo).toEqual('bar');
      });
    });

    it('sends cookies as string', function(done) {
      Honeybadger.configure({
        api_key: 'asdf'
      });

      Honeybadger.notify("testing", {
        cookies: 'foo=bar'
      });

      afterNotify(done, function() {
        expect(requests.length).toEqual(1);
        expect(request.payload.request.cgi_data.HTTP_COOKIE).toEqual('foo=bar');
      });
    });

    it('sends cookies as object', function(done) {
      Honeybadger.configure({
        api_key: 'asdf'
      });

      Honeybadger.notify("testing", {
        cookies: {
          foo: 'bar'
        }
      });

      afterNotify(done, function() {
        expect(requests.length).toEqual(1);
        expect(request.payload.request.cgi_data.HTTP_COOKIE).toEqual('foo=bar');
      });
    });

    it('reads default properties from error objects', function(done) {
      Honeybadger.configure({
        api_key: 'asdf'
      });

      var err = new Error('Test message');
      try {
        throw err;
      } catch (e) {
        Honeybadger.notify(e);
      }

      afterNotify(done, function() {
        expect(requests.length).toEqual(1);
        expect(request.payload.error.class).toEqual('Error');
        expect(request.payload.error.message).toEqual('Test message');
      });
    });

    it('reads metadata from error objects', function(done) {
      Honeybadger.configure({
        api_key: 'asdf'
      });

      var err = new Error("Testing");
      err.component = 'expected component';

      try {
        throw err;
      } catch (e) {
        Honeybadger.notify(e);
      }

      afterNotify(done, function() {
        expect(requests.length).toEqual(1);
        expect(request.payload.request.component).toEqual('expected component');
      });
    });

    it('merges context from error objects', function(done) {
      Honeybadger.configure({
        api_key: 'asdf'
      });

      var err = new Error("Testing");
      err.context = {
        foo: 'foo'
      }

      try {
        throw err;
      } catch (e) {
        Honeybadger.notify(e, { context: { bar: 'bar' } });
      }

      afterNotify(done, function() {
        expect(requests.length).toEqual(1);
        expect(request.payload.request.context).toEqual({ foo: 'foo', bar: 'bar' });
      });
    });

    it('does not clobber global url', function(done) {
      Honeybadger.configure({
        api_key: 'asdf'
      });

      try {
        throw new Error("Testing");
      } catch (e) {
        Honeybadger.notify(e);
      }

      afterNotify(done, function() {
        expect(url).toEqual('global');
      });
    });
  });

  describe('.wrap', function() {
    beforeEach(function() {
      Honeybadger.configure({
        api_key: 'asdf',
        onerror: false // Forces the same behavior across all browsers.
      });
    });

    it('notifies Honeybadger of errors and re-throws', function(done) {
      var error, func, caughtError;

      error = new Error("Testing");
      func = function() {
        throw(error);
      };

      try {
        // Wrap twice to verify that inner blocks don't report multiple times.
        Honeybadger.wrap(Honeybadger.wrap(func))();
      } catch (e) {
        caughtError = e;
      }

      expect(caughtError).toEqual(error);
      afterNotify(done, function() {
        expect(requests.length).toEqual(1);
      });
    });

    if (typeof Object.freeze === 'function') {
      it('returns original function if fn is not extensible', function() {
        var func = Object.freeze(function() {});
        expect(Honeybadger.wrap(func)).toEqual(func);
      });
    }

    it('returns the same function when wrapping itself', function() {
      var f = function() {}
      var w = Honeybadger.wrap;

      expect(w(w(f))).toEqual(w(f));
      expect(w(w(w(f)))).toEqual(w(w(f)));
    });

    it('coerces unknown objects into string error message', function(done) {
      var error, func, caughtError;

      error = 'testing';
      func = function() {
        throw(error);
      };

      try {
        Honeybadger.wrap(func)();
      } catch (e) {
        caughtError = e;
      }

      expect(caughtError).toEqual(error);
      afterNotify(done, function() {
        expect(requests.length).toEqual(1);
        expect(request.payload.error.message).toEqual('testing');
      });
    });
  });

  describe('beforeNotify', function() {
    beforeEach(function() {
      Honeybadger.configure({
        api_key: 'asdf'
      });
    });

    it('does not deliver notice when  beforeNotify callback returns false', function(done) {
      Honeybadger.beforeNotify(function() {
        return false;
      });
      Honeybadger.notify("testing");

      afterNotify(done, function() {
        expect(requests.length).toEqual(0);
      });
    });

    it('delivers notice when beforeNotify returns true', function(done) {
      Honeybadger.beforeNotify(function() {
        return true;
      });
      Honeybadger.notify("testing");

      afterNotify(done, function() {
        expect(requests.length).toEqual(1);
      });
    });

    it('delivers notice when beforeNotify has no return', function(done) {
      Honeybadger.beforeNotify(function() {});
      Honeybadger.notify("testing");

      afterNotify(done, function() {
        expect(requests.length).toEqual(1);
      });
    });
  });

  describe('JSON encoding', function() {
    beforeEach(function() {
      Honeybadger.configure({
        api_key: 'asdf'
      });
    });

    it('drops undefined values', function(done) {
      Honeybadger.notify("testing", {
        context: {
          foo: void 0,
          bar: 'baz'
        }
      });

      afterNotify(done, function() {
        expect(requests.length).toEqual(1);
        expect(request.payload.request.context).toEqual({bar: 'baz'});
      });
    });

    it('drops function values', function(done) {
      Honeybadger.notify("testing", {
        context: {
          foo: function() {},
          bar: 'baz'
        }
      });

      afterNotify(done, function() {
        expect(requests.length).toEqual(1);
        expect(request.payload.request.context).toEqual({foo: '[object Function]', bar: 'baz'});
      });
    });

    it('enforces configured max depth', function(done) {
      Honeybadger.notify("testing", {
        context: {
          one: { two: { three: { four: { five: { six: { seven: { eight: { nine: 'nine' }}}}}}}}
        }
      });

      afterNotify(done, function() {
        expect(requests.length).toEqual(1);
        expect(request.payload.request.context).toEqual(
          {one: { two: { three: { four: { five: { six: '[MAX DEPTH REACHED]'}}}}}}
        );
      });
    });

    if (typeof Object.create === 'function') {
      it('handles objects without prototypes as values', function(done) {
        var obj = Object.create(null);

        Honeybadger.notify("Test error message", {
          context: {
            key: obj,
          }
        });

        afterNotify(done, function() {
          expect(requests.length).toEqual(1);
          expect(request.payload.request.context).toEqual({key: '[object Object]'});
        });
      });
    }

    if (typeof Symbol === 'function') {
      it('serializes symbol values', function(done) {
        var sym = Symbol();

        Honeybadger.notify("testing", {
          context: {
            key: sym,
          }
        });

        afterNotify(done, function() {
          expect(requests.length).toEqual(1);
          expect(request.payload.request.context).toEqual({key: '[object Symbol]'});
        });
      });

      it('drops symbol keys', function(done) {
        var sym = Symbol();
        var context = {};

        context[sym] = 'value';

        Honeybadger.notify("testing", { context: context });

        afterNotify(done, function() {
          expect(requests.length).toEqual(1);
          expect(request.payload.request.context).toEqual({});
        });
      });
    }
  });

  describe('window.onerror callback', function() {
    describe('default behavior', function() {
      beforeEach(function() {
        Honeybadger.configure({
          api_key: 'asdf'
        });
      });

      it('notifies Honeybadger of unhandled exceptions', function(done) {
        window.onerror('testing', 'http://foo.bar', '123');
        afterNotify(done, function() {
          expect(requests.length).toEqual(1);
        });
      });

      it('skips cross-domain script errors', function(done) {
        window.onerror('Script error', 'http://foo.bar', 0);
        afterNotify(done, function() {
          expect(requests.length).toEqual(0);
        });
      });

      it('reports error object when it is available', function(done) {
        var err = new Error('expected-message');
        window.onerror('foo', 'http://foo.bar', '123', '456', err);
        afterNotify(done, function() {
          expect(requests.length).toEqual(1);
          expect(request.payload.error.message).toEqual('expected-message');
        });
      });

      it('reports stack from error object when available', function(done) {
        window.onerror('testing', 'http://foo.bar', '123', '345', {stack: 'expected'});
        afterNotify(done, function() {
          expect(requests.length).toEqual(1);
          expect(request.payload.error.backtrace).toEqual('expected');
        });
      });

      it('coerces unknown objects into string error message ', function(done) {
        window.onerror(null, null, null, null, 'testing');
        afterNotify(done, function() {
          expect(requests.length).toEqual(1);
          expect(request.payload.error.message).toEqual('testing');
        });
      });

      it('supplements stack property when the error object does not have one', function(done) {
        window.onerror('testing', 'http://foo.bar', '123', '345', 'testing');
        afterNotify(done, function() {
          expect(requests.length).toEqual(1);
          expect(request.payload.error.message).toEqual('testing');
        });
      });
    });

    describe('when onerror is disabled', function() {
      beforeEach(function() {
        Honeybadger.configure({
          api_key: 'asdf',
          onerror: false
        });
      });

      it('ignores unhandled errors', function(done) {
        window.onerror('testing', 'http://foo.bar', 0);
        afterNotify(done, function() {
          expect(requests.length).toEqual(0);
        });
      });
    });
  });

  describe('window.onunhandledrejection callback', function() {
    describe('default behavior', function() {
      beforeEach(function() {
        if (typeof PromiseRejectionEvent === 'undefined') {
          pending();
        }
      });

      beforeEach(function() {
        Honeybadger.configure({
          api_key: 'asdf'
        });
      });

      it('reports the promise rejection reason when it is a string', function(done) {
        let reason = 'Something has gone wrong'
        let promiseRejection = new PromiseRejectionEvent('unhandledrejection', {
          promise: Promise.reject(reason),
          reason
        })
        window.onunhandledrejection(promiseRejection);

        afterNotify(done, function() {
          expect(requests.length).toEqual(1);
          expect(request.payload.error.class).toEqual('window.onunhandledrejection');
          expect(request.payload.error.message).toEqual('UnhandledPromiseRejectionWarning: Something has gone wrong');
          expect(request.payload.error.backtrace).toBeUndefined();
        });
      });

      it('reports the promise rejection reason when it is an Error object', function(done) {
        let reason = new Error('Something has gone wrong')
        reason.stack = "the stack trace"
        let promiseRejection = new PromiseRejectionEvent('unhandledrejection', {
          promise: Promise.reject(reason),
          reason
        })
        window.onunhandledrejection(promiseRejection);

        afterNotify(done, function() {
          expect(requests.length).toEqual(1);
          expect(request.payload.error.class).toEqual('Error');
          expect(request.payload.error.message).toEqual('UnhandledPromiseRejectionWarning: Error: Something has gone wrong');
          expect(request.payload.error.backtrace).toEqual('the stack trace');
        });
      });

      it('supplements the stack when the promise rejection reason is an Error but does not have one', function(done) {
        let reason = new Error('Something has gone wrong')
        reason.stack = undefined
        reason.fileName = 'file.js'
        reason.lineNumber = 25
        let promiseRejection = new PromiseRejectionEvent('unhandledrejection', {
          promise: Promise.reject(reason),
          reason
        })
        window.onunhandledrejection(promiseRejection);

        afterNotify(done, function() {
          expect(requests.length).toEqual(1);
          expect(request.payload.error.backtrace).toContain('Something has gone wrong\n    at ? (file.js:25)')
        });
      });

      it('reports the promise rejection reason when it is a custom object', function(done) {
        let reason = { errorCode: '123' }
        let promiseRejection = new PromiseRejectionEvent('unhandledrejection', {
          promise: Promise.reject(reason),
          reason
        })
        window.onunhandledrejection(promiseRejection);

        afterNotify(done, function() {
          expect(requests.length).toEqual(1);
          expect(request.payload.error.class).toEqual('window.onunhandledrejection');
          expect(request.payload.error.message).toEqual('UnhandledPromiseRejectionWarning: {"errorCode":"123"}');
          expect(request.payload.error.backtrace).toBeUndefined();
        });
      });

      describe('when onunhandledrejection is disabled', function() {
        beforeEach(function() {
          Honeybadger.configure({
            api_key: 'asdf',
            onunhandledrejection: false
          });
        });

        it('ignores unhandled promise rejections', function(done) {
          let reason = 'Something has gone wrong'
          let promiseRejection = new PromiseRejectionEvent('unhandledrejection', {
            promise: Promise.reject(reason),
            reason
          })
          window.onunhandledrejection(promiseRejection);

          afterNotify(done, function() {
            expect(requests.length).toEqual(0);
          });
        });
      });
    })
  })

  describe('getVersion', function() {
    it('returns the current version', function() {
      expect(Honeybadger.getVersion()).toMatch(/\d\.\d\.\d/)
    });
  });
});

import Honeybadger from '..';

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
        throw new Error('Testing');
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
        throw new Error('Testing');
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
        throw new Error('Testing');
      } catch (e) {
        Honeybadger.notify(e);
      }

      afterNotify(done, function() {
        expect(requests.length).toEqual(1);
      });
    });

    it('does not deliver notice when not configured', function(done) {
      try {
        throw new Error('Testing');
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
        throw new Error('Testing');
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

      var notice = Honeybadger.notify('Honeybadger don\'t care, but you might.');

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
          throw new Error('Testing ' + (i+1));
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
          throw new Error('Testing ' + (i+1));
        } catch (e) {
          Honeybadger.notify(e);
        }
      }

      Honeybadger.resetMaxErrors();

      for(var i=0; i<3; i++) {
        try {
          throw new Error('Testing ' + (i+1));
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
          throw new Error('Testing ' + (i+1));
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

      Honeybadger.notify('expected message');

      afterNotify(done, function() {
        expect(requests.length).toEqual(1);
        expect(request.payload.error.message).toEqual('expected message');
        expect(request.payload.error.generator).toEqual('throw');
        expect(request.payload.error.backtrace).toEqual(jasmine.any(String));
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

      Honeybadger.notify('testing', {
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

      Honeybadger.notify('testing', {
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

      Honeybadger.notify('testing', {
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

      var err = new Error('Testing');
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

      var err = new Error('Testing');
      err.context = {
        foo: 'foo'
      };

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
        throw new Error('Testing');
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

      error = new Error('Testing');
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
      var f = function() {};
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
        apiKey: 'asdf',
        environment: 'config environment',
        component: 'config component',
        action: 'config action',
        revision: 'config revision',
        projectRoot: 'config projectRoot'
      });
    });

    it('does not deliver notice when  beforeNotify callback returns false', function(done) {
      Honeybadger.beforeNotify(function() {
        return false;
      });
      Honeybadger.notify('testing');

      afterNotify(done, function() {
        expect(requests.length).toEqual(0);
      });
    });

    it('delivers notice when beforeNotify returns true', function(done) {
      Honeybadger.beforeNotify(function() {
        return true;
      });
      Honeybadger.notify('testing');

      afterNotify(done, function() {
        expect(requests.length).toEqual(1);
      });
    });

    it('delivers notice when beforeNotify has no return', function(done) {
      Honeybadger.beforeNotify(function() {});
      Honeybadger.notify('testing');

      afterNotify(done, function() {
        expect(requests.length).toEqual(1);
      });
    });

    it('it is called with default notice properties', function(done) {
      let notice;
      Honeybadger.beforeNotify(function(n) {
        notice = n;
      });

      Honeybadger.notify('expected message');

      afterNotify(done, function() {
        expect(requests.length).toEqual(1);

        expect(notice.stack).toEqual(jasmine.any(String));
        expect(notice.name).toEqual('Error');
        expect(notice.message).toEqual('expected message');
        expect(notice.url).toEqual(jasmine.any(String));
        expect(notice.projectRoot).toEqual('config projectRoot');
        expect(notice.environment).toEqual('config environment');
        expect(notice.component).toEqual('config component');
        expect(notice.action).toEqual('config action');
        expect(notice.fingerprint).toEqual(undefined);
        expect(notice.context).toEqual({});
        expect(notice.params).toEqual(undefined);
        expect(notice.cookies).toEqual(undefined);
        expect(notice.revision).toEqual('config revision');
      });
    });

    it('it is called with overridden notice properties', function(done) {
      let notice;
      Honeybadger.beforeNotify(function(n) {
        notice = n;
      });

      Honeybadger.notify({
        stack: 'expected stack',
        name: 'expected name',
        message: 'expected message',
        url: 'expected url',
        projectRoot: 'expected projectRoot',
        environment: 'expected environment',
        component: 'expected component',
        action: 'expected action',
        fingerprint: 'expected fingerprint',
        context: { expected_context_key: 'expected value' },
        params: { expected_params_key: 'expected value' },
        cookies: { expected_cookies_key: 'expected value' },
        revision: 'expected revision'
      });

      afterNotify(done, function() {
        expect(requests.length).toEqual(1);

        expect(notice.stack).toEqual('expected stack');
        expect(notice.name).toEqual('expected name');
        expect(notice.message).toEqual('expected message');
        expect(notice.url).toEqual('expected url');
        expect(notice.projectRoot).toEqual('expected projectRoot');
        expect(notice.environment).toEqual('expected environment');
        expect(notice.component).toEqual('expected component');
        expect(notice.action).toEqual('expected action');
        expect(notice.fingerprint).toEqual('expected fingerprint');
        expect(notice.context).toEqual({ expected_context_key: 'expected value' });
        expect(notice.params).toEqual({ expected_params_key: 'expected value' });
        expect(notice.cookies).toEqual({ expected_cookies_key: 'expected value' });
        expect(notice.revision).toEqual('expected revision');
      });
    });

    it('it assigns notice properties', function(done) {
      Honeybadger.beforeNotify(function(notice) {
        notice.stack = 'expected stack',
        notice.name = 'expected name',
        notice.message = 'expected message',
        notice.url = 'expected url',
        notice.projectRoot = 'expected projectRoot',
        notice.environment = 'expected environment',
        notice.component = 'expected component',
        notice.action = 'expected action',
        notice.fingerprint = 'expected fingerprint',
        notice.context = { expected_context_key: 'expected value' },
        notice.params = { expected_params_key: 'expected value' },
        notice.cookies = 'expected cookie value';
        notice.revision = 'expected revision';
      });

      Honeybadger.notify('notify message');

      afterNotify(done, function() {
        expect(requests.length).toEqual(1);

        expect(request.payload.error.backtrace).toEqual('expected stack');
        expect(request.payload.error.class).toEqual('expected name');
        expect(request.payload.error.message).toEqual('expected message');
        expect(request.payload.request.url).toEqual('expected url');
        expect(request.payload.server.project_root).toEqual('expected projectRoot');
        expect(request.payload.server.environment_name).toEqual('expected environment');
        expect(request.payload.request.component).toEqual('expected component');
        expect(request.payload.request.action).toEqual('expected action');
        expect(request.payload.error.fingerprint).toEqual('expected fingerprint');
        expect(request.payload.request.context).toEqual({ expected_context_key: 'expected value' });
        expect(request.payload.request.params).toEqual({ expected_params_key: 'expected value' });
        expect(request.payload.request.cgi_data.HTTP_COOKIE).toEqual('expected cookie value');
        expect(request.payload.server.revision).toEqual('expected revision');
      });
    });

    it('does not expose the stack generator', function(done) {
      let notice;
      Honeybadger.beforeNotify(function(n) {
        notice = n;
      });

      Honeybadger.notify('expected message');

      afterNotify(done, function() {
        expect(requests.length).toEqual(1);
        expect(notice.generator).toEqual(undefined);
        expect(request.payload.error.backtrace).toEqual(jasmine.any(String));
        expect(request.payload.error.generator).toEqual('throw');
      });
    });

    it('it resets generator when stack changes', function(done) {
      Honeybadger.beforeNotify(function(notice) {
        notice.stack = 'expected stack';
      });

      Honeybadger.notify('expected message');

      afterNotify(done, function() {
        expect(requests.length).toEqual(1);
        expect(request.payload.error.backtrace).toEqual(jasmine.any(String));
        expect(request.payload.error.generator).toEqual(undefined);
      });
    });
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
        let reason = 'Something has gone wrong';
        let promiseRejection = new PromiseRejectionEvent('unhandledrejection', {
          promise: Promise.reject(reason),
          reason
        });
        window.onunhandledrejection(promiseRejection);

        afterNotify(done, function() {
          expect(requests.length).toEqual(1);
          expect(request.payload.error.class).toEqual('window.onunhandledrejection');
          expect(request.payload.error.message).toEqual('UnhandledPromiseRejectionWarning: Something has gone wrong');
          expect(request.payload.error.backtrace).toBeUndefined();
        });
      });

      it('reports the promise rejection reason when it is an Error object', function(done) {
        let reason = new Error('Something has gone wrong');
        reason.stack = 'the stack trace';
        let promiseRejection = new PromiseRejectionEvent('unhandledrejection', {
          promise: Promise.reject(reason),
          reason
        });
        window.onunhandledrejection(promiseRejection);

        afterNotify(done, function() {
          expect(requests.length).toEqual(1);
          expect(request.payload.error.class).toEqual('Error');
          expect(request.payload.error.message).toEqual('UnhandledPromiseRejectionWarning: Error: Something has gone wrong');
          expect(request.payload.error.backtrace).toEqual('the stack trace');
        });
      });

      it('supplements the stack when the promise rejection reason is an Error but does not have one', function(done) {
        let reason = new Error('Something has gone wrong');
        reason.stack = undefined;
        reason.fileName = 'file.js';
        reason.lineNumber = 25;
        let promiseRejection = new PromiseRejectionEvent('unhandledrejection', {
          promise: Promise.reject(reason),
          reason
        });
        window.onunhandledrejection(promiseRejection);

        afterNotify(done, function() {
          expect(requests.length).toEqual(1);
          expect(request.payload.error.backtrace).toContain('Something has gone wrong\n    at ? (file.js:25)');
        });
      });

      it('reports the promise rejection reason when it is a custom object', function(done) {
        let reason = { errorCode: '123' };
        let promiseRejection = new PromiseRejectionEvent('unhandledrejection', {
          promise: Promise.reject(reason),
          reason
        });
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
          let reason = 'Something has gone wrong';
          let promiseRejection = new PromiseRejectionEvent('unhandledrejection', {
            promise: Promise.reject(reason),
            reason
          });
          window.onunhandledrejection(promiseRejection);

          afterNotify(done, function() {
            expect(requests.length).toEqual(0);
          });
        });
      });
    });
  });

  describe('getVersion', function() {
    it('returns the current version', function() {
      expect(Honeybadger.getVersion()).toMatch(/\d\.\d\.\d/);
    });
  });

  describe('addBreadcrumb', function() {
    beforeEach(function() {
      Honeybadger.configure({
        api_key: 'asdf',
        breadcrumbsEnabled: true,
      });
    });

    it('has default breadcrumbs', function() {
      expect(Honeybadger.breadcrumbs).toEqual([]);
    });

    it('adds a breadcrumb with defaults', function() {
      Honeybadger.addBreadcrumb('expected message');

      expect(Honeybadger.breadcrumbs.length).toBe(1);

      const crumb = Honeybadger.breadcrumbs[0];

      expect(crumb.message).toEqual('expected message');
      expect(crumb.category).toEqual('custom');
      expect(crumb.metadata).toEqual({});
      expect(crumb.timestamp).toEqual(jasmine.any(String));
    });

    it('overrides the default category', function() {
      Honeybadger.addBreadcrumb('message', {
        category: 'test'
      });

      expect(Honeybadger.breadcrumbs.length).toBe(1);
      expect(Honeybadger.breadcrumbs[0].category).toEqual('test');
    });

    it('overrides the default metadata', function() {
      Honeybadger.addBreadcrumb('message', {
        metadata: {
          key: 'expected value'
        }
      });

      expect(Honeybadger.breadcrumbs.length).toBe(1);
      expect(Honeybadger.breadcrumbs[0].metadata).toEqual({
        key: 'expected value'
      });
    });

    it('maintains the size of the breadcrumbs queue', function() {
      for (let i=0; i<=45; i++) {
        Honeybadger.addBreadcrumb('expected message ' + i);
      }

      expect(Honeybadger.breadcrumbs.length).toBe(40);

      expect(Honeybadger.breadcrumbs[0].message).toEqual('expected message 6');
      expect(Honeybadger.breadcrumbs[39].message).toEqual('expected message 45');
    });

    it('sends breadcrumbs when enabled', function(done) {
      Honeybadger.addBreadcrumb('expected message');
      Honeybadger.notify('message');

      afterNotify(done, function() {
        expect(requests.length).toBe(1);
        expect(request.payload.breadcrumbs.enabled).toBe(true);
        expect(request.payload.breadcrumbs.trail.length).toBe(2);
        expect(request.payload.breadcrumbs.trail[0].message).toEqual('expected message');
      });
    });

    it('sends empty breadcrumbs when disabled', function(done) {
      Honeybadger.configure({
        breadcrumbsEnabled: false,
      });

      Honeybadger.addBreadcrumb('message');
      Honeybadger.notify('message');

      afterNotify(done, function() {
        expect(requests.length).toBe(1);
        expect(request.payload.breadcrumbs.enabled).toBe(false);
        expect(request.payload.breadcrumbs.trail).toEqual([]);
      });
    });
  });
});

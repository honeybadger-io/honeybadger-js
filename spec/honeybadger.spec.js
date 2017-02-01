describe('Honeybadger', function() {
  var requests, xhr;

  beforeEach(function() {
    // Refresh singleton state.
    Honeybadger.reset();

    // Stub HTTP requests.
    requests = [];
    xhr = sinon.useFakeXMLHttpRequest();
    xhr.onCreate = function(xhr) {
      return requests.push(xhr);
    };
  });

  afterEach(function() {
    xhr.restore();
  });

  function afterNotify(callback) {
    waits(1);
    runs(callback);
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
    it('delivers the notice when enabled', function() {
      Honeybadger.configure({
        api_key: 'asdf'
      });

      try {
        throw new Error("Testing");
      } catch (e) {
        Honeybadger.notify(e);
      }

      afterNotify(function() {
        expect(requests.length).toEqual(1);
      });
    });

    it('does not deliver notice when not configured', function() {
      try {
        throw new Error("Testing");
      } catch (e) {
        Honeybadger.notify(e);
      }

      afterNotify(function() {
        expect(requests.length).toEqual(0);
      });
    });

    it('does not deliver notice when disabled', function() {
      Honeybadger.configure({
        api_key: 'asdf',
        disabled: true
      });

      try {
        throw new Error("Testing");
      } catch (e) {
        Honeybadger.notify(e);
      }

      afterNotify(function() {
        expect(requests.length).toEqual(0);
      });
    });

    it('does not deliver notice without arguments', function() {
      Honeybadger.configure({
        api_key: 'asdf'
      });

      Honeybadger.notify();
      Honeybadger.notify(null);
      Honeybadger.notify(null, {});
      Honeybadger.notify({});

      afterNotify(function() {
        expect(requests.length).toEqual(0);
      });
    });

    it('generates a stack trace without an error', function() {
      Honeybadger.configure({
        api_key: 'asdf'
      });

      var notice = Honeybadger.notify("Honeybadger don't care, but you might.");

      expect(notice.stack).toEqual(jasmine.any(String));
      expect(notice.generator).toEqual(jasmine.any(String));
      expect(notice.message).toEqual("Honeybadger don't care, but you might.");
      afterNotify(function() {
        expect(requests.length).toEqual(1);
      });
    });

    it('accepts options as first argument', function() {
      Honeybadger.configure({
        api_key: 'asdf'
      });

      try {
        throw new Error("Honeybadger don't care, but you might.");
      } catch (e) {
        Honeybadger.notify({
          error: e
        });
      }

      afterNotify(function() {
        expect(requests.length).toEqual(1);
      });
    });

    it('accepts name as second argument', function() {
      Honeybadger.configure({
        api_key: 'asdf'
      });

      try {
        throw new Error("Honeybadger don't care, but you might.");
      } catch (e) {
        Honeybadger.notify(e, 'CustomError');
      }

      afterNotify(function() {
        expect(requests.length).toEqual(1);
      });
    });

    it('accepts options as third argument', function() {
      Honeybadger.configure({
        api_key: 'asdf'
      });

      try {
        throw new Error("Honeybadger don't care, but you might.");
      } catch (e) {
        Honeybadger.notify(e, 'CustomError', {
          message: 'Custom message'
        });
      }

      afterNotify(function() {
        expect(requests.length).toEqual(1);
      });
    });

    it('sends params', function() {
      Honeybadger.configure({
        api_key: 'asdf'
      });

      Honeybadger.notify("testing", {
        params: {
          foo: 'bar'
        }
      });

      afterNotify(function() {
        expect(requests.length).toEqual(1);
        expect(requests[0].url).toMatch('notice%5Brequest%5D%5Bparams%5D%5Bfoo%5D=bar');
      });
    });

    it('sends cookies as string', function() {
      Honeybadger.configure({
        api_key: 'asdf'
      });

      Honeybadger.notify("testing", {
        cookies: 'foo=bar'
      });

      afterNotify(function() {
        expect(requests.length).toEqual(1);
        expect(requests[0].url).toMatch('notice%5Brequest%5D%5Bcgi_data%5D%5BHTTP_COOKIE%5D=foo%3Dbar');
      });
    });

    it('sends cookies as object', function() {
      Honeybadger.configure({
        api_key: 'asdf'
      });

      Honeybadger.notify("testing", {
        cookies: {
          foo: 'bar'
        }
      });

      afterNotify(function() {
        expect(requests.length).toEqual(1);
        expect(requests[0].url).toMatch('notice%5Brequest%5D%5Bcgi_data%5D%5BHTTP_COOKIE%5D=foo%3Dbar');
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

    it('notifies Honeybadger of errors and re-throws', function() {
      var error, func, caughtError;

      error = new Error("Testing")
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
      afterNotify(function() {
        expect(requests.length).toEqual(1);
      });
    });
  });

  describe('beforeNotify', function() {
    beforeEach(function() {
      Honeybadger.configure({
        api_key: 'asdf'
      });
    });

    it('does not deliver notice when  beforeNotify callback returns false', function() {
      Honeybadger.beforeNotify(function() {
        return false;
      });
      Honeybadger.notify("testing");

      afterNotify(function() {
        expect(requests.length).toEqual(0);
      });
    });

    it('delivers notice when beforeNotify returns true', function() {
      Honeybadger.beforeNotify(function() {
        return true;
      });
      Honeybadger.notify("testing");

      afterNotify(function() {
        expect(requests.length).toEqual(1);
      });
    });

    it('delivers notice when beforeNotify has no return', function() {
      Honeybadger.beforeNotify(function() {});
      Honeybadger.notify("testing");

      afterNotify(function() {
        expect(requests.length).toEqual(1);
      });
    });
  });

  describe('payload query string', function() {
    beforeEach(function() {
      Honeybadger.configure({
        api_key: 'asdf'
      });
    });

    it('serializes an object to a query string', function() {
      Honeybadger.notify("testing", {
        context: {
          foo: 'foo',
          bar: {
            baz: 'baz'
          }
        }
      });

      afterNotify(function() {
        expect(requests.length).toEqual(1);
        expect(requests[0].url).toMatch('notice%5Brequest%5D%5Bcontext%5D%5Bfoo%5D=foo&notice%5Brequest%5D%5Bcontext%5D%5Bbar%5D%5Bbaz%5D=baz');
      });
    });

    it('drops null values', function() {
      Honeybadger.notify("testing", {
        context: {
          foo: null,
          bar: 'baz'
        }
      });

      afterNotify(function() {
        expect(requests.length).toEqual(1);
        expect(requests[0].url).not.toMatch('foo');
        expect(requests[0].url).toMatch('notice%5Brequest%5D%5Bcontext%5D%5Bbar%5D=baz');
      });
    });

    it('drops undefined values', function() {
      Honeybadger.notify("testing", {
        context: {
          foo: void 0,
          bar: 'baz'
        }
      });

      afterNotify(function() {
        expect(requests.length).toEqual(1);
        expect(requests[0].url).not.toMatch('foo');
        expect(requests[0].url).toMatch('notice%5Brequest%5D%5Bcontext%5D%5Bbar%5D=baz');
      });
    });

    if (typeof Symbol === 'function') {
      it('handles symbols as values', function() {
        var sym = Symbol();

        Honeybadger.notify("testing", {
          context: {
            key: sym,
          }
        });

        afterNotify(function() {
          expect(requests.length).toEqual(1);
          expect(requests[0].url).toMatch('js.gif?');
        });
      });

      it('handles symbol as a key', function() {
        var sym = Symbol();
        var context = {};

        context[sym] = 'value';

        Honeybadger.notify("testing", { context: context });

        afterNotify(function() {
          expect(requests.length).toEqual(1);
          expect(requests[0].url).toMatch('js.gif?');
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

      it('notifies Honeybadger of unhandled exceptions', function() {
        window.onerror('testing', 'http://foo.bar', '123');
        afterNotify(function() {
          expect(requests.length).toEqual(1);
        });
      });

      it('skips cross-domain script errors', function() {
        window.onerror('Script error', 'http://foo.bar', 0);
        afterNotify(function() {
          expect(requests.length).toEqual(0);
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

      it('ignores unhandled errors', function() {
        window.onerror('testing', 'http://foo.bar', 0);
        afterNotify(function() {
          expect(requests.length).toEqual(0);
        });
      });
    });
  });

  describe('getVersion', function() {
    it('returns the current version', function() {
      expect(Honeybadger.getVersion()).toMatch(/\d\.\d\.\d/)
    });
  });
});

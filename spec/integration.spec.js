import { nativeFetch } from '../src/util/browser.js';

/**
 * Creates a new integration sandbox.
 * @param {function} callback Invoked when the sandbox is ready.
 * @return {!HTMLElement} The sandbox object.
*/
function createSandbox(callback) {
  const sandbox = document.createElement('iframe');

  sandbox.style.display = 'none';
  sandbox.src = '/base/spec/sandbox.html';
  sandbox.onload = callback;

  function sandboxEval(code) {
    sandbox.contentWindow.eval(
      'setTimeout(function() {' +
        'var func = ' + code.toString() + ';' +
        'func(window.report);' +
      '});'
    );
  }

  // Use `sandbox.run(function() {})` to execute the function inside
  // the sandboxed environment.
  sandbox.run = function(code) {
    let resolve;
    const promise = new Promise(function(r) {
      resolve = r;
    });

    sandbox.contentWindow.reportResults = function(results) {
      resolve(results);
    };

    const report = function() {
      setTimeout(function() {
        window.reportResults(results);
      });
    };

    sandbox.contentWindow.report = function() {
      sandboxEval(report);
    };

    sandboxEval(code);

    // If the code expects an argument, it is responsible to report.
    if (code.length === 0) {
      sandboxEval(report);
    }

    return promise;
  };

  // Use `sandbox.destroy()` to stop using the sandbox.
  sandbox.destroy = function() {
    document.body.removeChild(sandbox);
  };

  document.body.appendChild(sandbox);

  return sandbox;
}


describe('browser integration', function() {
  let sandbox;

  beforeEach(function(done) {
    sandbox = createSandbox(done);
  });

  afterEach(function() {
    sandbox.destroy();
  });

  it('notifies Honeybadger of unhandled exceptions', function(done) {
    sandbox
      .run(function() {
        throw new Error('unhandled exception');
      })
      .then(function(results) {
        expect(results.notices.length).toEqual(1);
        expect(results.notices[0].message).toEqual('unhandled exception');
        done();
      })
      .catch(done);
  });

  it('notifies Honeybadger manually', function(done) {
    sandbox
      .run(function() {
        Honeybadger.notify('expected message');
      })
      .then(function(results) {
        expect(results.notices.length).toEqual(1);
        expect(results.notices[0].message).toEqual('expected message');
        done();
      })
      .catch(done);
  });

  it('sends console breadcrumbs', function(done) {
    sandbox
      .run(function() {
        console.log('expected message');
        Honeybadger.notify('testing');
      })
      .then(function(results) {
        expect(results.notices.length).toEqual(1);
        expect(results.notices[0].breadcrumbs.length).toEqual(2);
        expect(results.notices[0].breadcrumbs[0].message).toEqual('expected message');
        expect(results.notices[0].breadcrumbs[0].category).toEqual('log');
        done();
      })
      .catch(done);
  });

  it('sends click breadcrumbs', function(done) {
    sandbox
      .run(function() {
        var button = document.getElementById('buttonId');
        button.click();
        Honeybadger.notify('testing');
      })
      .then(function(results) {
        expect(results.notices.length).toEqual(1);
        expect(results.notices[0].breadcrumbs.length).toEqual(2);
        expect(results.notices[0].breadcrumbs[0].message).toEqual('button#buttonId');
        expect(results.notices[0].breadcrumbs[0].category).toEqual('ui.click');
        done();
      })
      .catch(done);
  });

  it('sends XHR breadcrumbs', function(done) {
    sandbox
      .run(function(report) {
        var request = new XMLHttpRequest();
        request.open('GET', '/example/path', false);
        request.onreadystatechange = function() {
          if (request.readyState === 4) {
            Honeybadger.notify('testing');
            report();
          }
        };
        request.send(null);
      })
      .then(function(results) {
        expect(results.notices.length).toEqual(1);
        expect(results.notices[0].breadcrumbs.length).toEqual(2);
        expect(results.notices[0].breadcrumbs[0].message).toEqual('XMLHttpRequest');
        expect(results.notices[0].breadcrumbs[0].category).toEqual('request');
        done();
      })
      .catch(done);
  });

  it('sends fetch breadcrumbs', function(done) {
    sandbox
      .run(function(report) {
        fetch('/example/path')
          .then(function() {
            Honeybadger.notify('testing');
            report();
          })
          .catch(report);
      })
      .then(function(results) {
        expect(results.notices.length).toEqual(1);
        expect(results.notices[0].breadcrumbs.length).toEqual(2);
        // fetch polyfill uses XHR.
        expect(results.notices[0].breadcrumbs[0].message).toEqual(nativeFetch() ? 'fetch' : 'XMLHttpRequest');
        expect(results.notices[0].breadcrumbs[0].category).toEqual('request');
        done();
      })
      .catch(done);
  });

  it('sends navigation breadcrumbs', function(done) {
    sandbox
      .run(function() {
        history.pushState({}, '', 'foo.html');
        Honeybadger.notify('testing');
      })
      .then(function(results) {
        expect(results.notices.length).toEqual(1);
        expect(results.notices[0].breadcrumbs.length).toEqual(2);
        expect(results.notices[0].breadcrumbs[0].message).toEqual('Page changed');
        expect(results.notices[0].breadcrumbs[0].category).toEqual('navigation');
        expect(results.notices[0].breadcrumbs[0].metadata).toEqual({
          from: 'http://localhost:9876/base/spec/sandbox.html',
          to: 'foo.html'
        });
        done();
      })
      .catch(done);
  });

  it('sends notify breadcrumbs', function(done) {
    sandbox
      .run(function() {
        Honeybadger.notify('expected message', { name: 'expected name' });
      })
      .then(function(results) {
        expect(results.notices.length).toEqual(1);
        expect(results.notices[0].breadcrumbs.length).toEqual(1);
        expect(results.notices[0].breadcrumbs[0].message).toEqual('Honeybadger Notice');
        expect(results.notices[0].breadcrumbs[0].category).toEqual('notice');
        expect(results.notices[0].breadcrumbs[0].metadata).toEqual(jasmine.objectContaining({
          name: 'expected name',
          message: 'expected message',
          stack: jasmine.any(String)
        }));
        expect(results.notices[0].breadcrumbs[0].metadata).not.toEqual(jasmine.objectContaining({
          context: jasmine.anything()
        }));
        done();
      })
      .catch(done);
  });

  it('sends window.onerror breadcrumbs', function(done) {
    sandbox
      .run(function() {
        results.error = new Error('expected message');
        throw results.error;
      })
      .then(function(results) {
        expect(results.notices.length).toEqual(1);
        expect(results.notices[0].breadcrumbs.length).toEqual(2);
        expect(results.notices[0].breadcrumbs[0].message).toEqual('window.onerror: Error');
        expect(results.notices[0].breadcrumbs[0].category).toEqual('error');
        expect(results.notices[0].breadcrumbs[0].metadata).toEqual(jasmine.objectContaining({
          message: 'expected message',
          name: 'Error',
          stack: results.error.stack
        }));
        done();
      })
      .catch(done);
  });

  it('sends Honeybadger.wrap breadcrumbs when onerror is disabled', function(done) {
    sandbox
      .run(function() {
        Honeybadger.configure({ onerror: false });
        results.error = new Error('expected message');
        Honeybadger.wrap(function() {
          throw(results.error);
        })();
      })
      .then(function(results) {
        expect(results.notices.length).toEqual(1);
        expect(results.notices[0].breadcrumbs.length).toEqual(2);
        expect(results.notices[0].breadcrumbs[0].message).toEqual('Error');
        expect(results.notices[0].breadcrumbs[0].category).toEqual('error');
        expect(results.notices[0].breadcrumbs[0].metadata).toEqual(jasmine.objectContaining({
          message: 'expected message',
          name: 'Error',
          stack: results.error.stack
        }));
        done();
      })
      .catch(done);
  });
});

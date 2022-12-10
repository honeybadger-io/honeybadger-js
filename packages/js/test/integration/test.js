/* eslint-disable */
const isIE = window.document.documentMode;

/**
 * Creates a new integration sandbox.
 * @param {function} callback Invoked when the sandbox is ready.
 * @return {!HTMLElement} The sandbox object.
*/
function createSandbox(callback) {
  const sandbox = document.createElement('iframe');

  sandbox.style.display = 'none';
  sandbox.src = '/base/test/integration/sandbox.html';
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
  sandbox.run = function (code) {
    let resolve;
    const promise = new Promise(function (r) {
      resolve = r;
    });

    sandbox.contentWindow.reportResults = function (results) {
      resolve(results);
    };

    const report = function () {
      setTimeout(function () {
        window.reportResults(results);
      }, 50);
    };

    sandbox.contentWindow.report = function () {
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
  sandbox.destroy = function () {
    document.body.removeChild(sandbox);
  };

  document.body.appendChild(sandbox);

  return sandbox;
}


describe('browser integration', function () {
  let sandbox;

  beforeEach(function (done) {
    sandbox = createSandbox(done);
  });

  afterEach(function () {
    sandbox.destroy();
  });

  it('notifies Honeybadger of unhandled exceptions', function (done) {
    sandbox
      .run(function () {
        throw new Error('unhandled exception');
      })
      .then(function (results) {
        expect(results.notices.length).toEqual(1);
        expect(results.notices[0].error.message).toEqual('unhandled exception');
        done();
      })
      .catch(done);
  });

  it('notifies Honeybadger manually', function (done) {
    sandbox
      .run(function () {
        Honeybadger.notify('expected message');
      })
      .then(function (results) {
        expect(results.notices.length).toEqual(1);
        expect(results.notices[0].error.message).toEqual('expected message');
        done();
      })
      .catch(done);
  });

  it('reports multiple errors in the same process', function (done) {
    sandbox
      .run(function () {
        Honeybadger.notify('expected message 1');
        Honeybadger.notify('expected message 2');
        throw new Error('unhandled exception');
      })
      .then(function (results) {
        expect(results.notices.length).toEqual(3);
        done();
      })
      .catch(done);
  });

  it('skips onunhandledrejection when already sent', function (done) {
    if (!('onunhandledrejection' in window)) { pending(); }

    sandbox
      .run(function () {
        const promise = new Promise(function (resolutionFunc, rejectionFunc) {
          throw new Error('unhandled exception');
        });
        promise
          .then(function (value) { console.log("value:", value) })
          .catch(function (err) { Honeybadger.notify(err) });
      })
      .then(function (results) {
        expect(results.notices.length).toEqual(1);
        done();
      })
      .catch(done);
  });

  it('sends console breadcrumbs', function (done) {
    sandbox
      .run(function () {
        console.log('expected message');
        Honeybadger.notify('testing');
      })
      .then(function (results) {
        expect(results.notices.length).toEqual(1);
        expect(results.notices[0].breadcrumbs.trail.length).toEqual(2);
        expect(results.notices[0].breadcrumbs.trail[0].message).toEqual('expected message');
        expect(results.notices[0].breadcrumbs.trail[0].category).toEqual('log');
        done();
      })
      .catch(done);
  });

  it('sends string value console breadcrumbs when null', function (done) {
    sandbox
      .run(function () {
        console.log(null);
        Honeybadger.notify('testing');
      })
      .then(function (results) {
        expect(results.notices.length).toEqual(1);
        expect(results.notices[0].breadcrumbs.trail.length).toEqual(2);
        expect(results.notices[0].breadcrumbs.trail[0].message).toEqual('null');
        expect(results.notices[0].breadcrumbs.trail[0].category).toEqual('log');
        done();
      })
      .catch(done);
  });

  it('sends click breadcrumbs', function (done) {
    sandbox
      .run(function () {
        var button = document.getElementById('buttonId');
        button.click();
        Honeybadger.notify('testing');
      })
      .then(function (results) {
        expect(results.notices.length).toEqual(1);
        expect(results.notices[0].breadcrumbs.trail.length).toEqual(2);
        expect(results.notices[0].breadcrumbs.trail[0].message).toEqual('button#buttonId');
        expect(results.notices[0].breadcrumbs.trail[0].category).toEqual('ui.click');
        expect(results.notices[0].breadcrumbs.trail[0].metadata.selector).toEqual('body > div#buttonDivId > button#buttonId');
        expect(results.notices[0].breadcrumbs.trail[0].metadata.text).toEqual('button text');
        done();
      })
      .catch(done);
  });

  it('sends XHR breadcrumbs for relative paths', function (done) {
    sandbox
      .run(function (report) {
        var request = new XMLHttpRequest();
        request.open('GET', '/example/path', false);
        request.onreadystatechange = function () {
          if (request.readyState === 4) {
            Honeybadger.notify('testing');
            report();
          }
        };
        request.send(null);
      })
      .then(function (results) {
        expect(results.notices.length).toEqual(1);
        expect(results.notices[0].breadcrumbs.trail.length).toEqual(2);
        expect(results.notices[0].breadcrumbs.trail[0].message).toEqual('GET /example/path');
        expect(results.notices[0].breadcrumbs.trail[0].category).toEqual('request');
        expect(results.notices[0].breadcrumbs.trail[0].metadata.type).toEqual('xhr');
        expect('message' in results.notices[0].breadcrumbs.trail[0].metadata).toBe(false);
        done();
      })
      .catch(done);
  });

  it('sends XHR breadcrumbs for absolute paths', function (done) {
    sandbox
      .run(function (report) {
        var request = new XMLHttpRequest();
        request.open('GET', 'https://example.com/example/path', true);
        request.onreadystatechange = function () {
          if (request.readyState === 4) {
            Honeybadger.notify('testing');
            report();
          }
        };
        request.send(null);
      })
      .then(function (results) {
        expect(results.notices.length).toEqual(1);
        expect(results.notices[0].breadcrumbs.trail.length).toEqual(2);
        expect(results.notices[0].breadcrumbs.trail[0].message).toEqual('GET https://example.com/example/path');
        expect(results.notices[0].breadcrumbs.trail[0].category).toEqual('request');
        expect(results.notices[0].breadcrumbs.trail[0].metadata.type).toEqual('xhr');
        expect('message' in results.notices[0].breadcrumbs.trail[0].metadata).toBe(false);
        done();
      })
      .catch(done);
  });

  it('sends fetch breadcrumbs', function (done) {
    sandbox
      .run(function (report) {
        fetch('/example/path')
          .then(function () {
            Honeybadger.notify('testing');
            report();
          })
          .catch(report);
      })
      .then(function (results) {
        expect(results.notices.length).toEqual(1);
        expect(results.notices[0].breadcrumbs.trail.length).toEqual(2);
        expect(results.notices[0].breadcrumbs.trail[0].message).toEqual('GET /example/path');
        expect(results.notices[0].breadcrumbs.trail[0].category).toEqual('request');
        // fetch polyfill uses XHR.
        expect(results.notices[0].breadcrumbs.trail[0].metadata.type).toEqual(isIE ? 'xhr' : 'fetch');
        done();
      })
      .catch(done);
  });

  it('sends navigation breadcrumbs', function (done) {
    sandbox
      .run(function () {
        history.pushState({}, '', 'foo.html');
        Honeybadger.notify('testing');
      })
      .then(function (results) {
        expect(results.notices.length).toEqual(1);
        expect(results.notices[0].breadcrumbs.trail.length).toEqual(2);
        expect(results.notices[0].breadcrumbs.trail[0].message).toEqual('Page changed');
        expect(results.notices[0].breadcrumbs.trail[0].category).toEqual('navigation');
        expect(results.notices[0].breadcrumbs.trail[0].metadata).toEqual({
          // The hostname is different when running locally vs. in CI.
          from: jasmine.stringMatching(/http:\/\/.+:9876\/base\/test\/integration\/sandbox\.html/),
          to: 'foo.html'
        });
        done();
      })
      .catch(done);
  });

  it('sends notify breadcrumbs', function (done) {
    sandbox
      .run(function () {
        Honeybadger.notify('expected message', { name: 'expected name', stack: 'expected stack' });
      })
      .then(function (results) {
        expect(results.notices.length).toEqual(1);
        expect(results.notices[0].breadcrumbs.trail.length).toEqual(1);
        expect(results.notices[0].breadcrumbs.trail[0].message).toEqual('Honeybadger Notice');
        expect(results.notices[0].breadcrumbs.trail[0].category).toEqual('notice');
        expect(results.notices[0].breadcrumbs.trail[0].metadata).toEqual(jasmine.objectContaining({
          name: 'expected name',
          message: 'expected message',
          stack: jasmine.any(String)
        }));
        expect(results.notices[0].breadcrumbs.trail[0].metadata).not.toEqual(jasmine.objectContaining({
          context: jasmine.anything()
        }));
        done();
      })
      .catch(done);
  });

  it('sends window.onerror breadcrumbs', function (done) {
    sandbox
      .run(function () {
        results.error = new Error('expected message');
        throw results.error;
      })
      .then(function (results) {
        expect(results.notices.length).toEqual(1);
        expect(results.notices[0].breadcrumbs.trail).toBeArray();

        const errorBreadcrumbs = results.notices[0].breadcrumbs.trail.filter(function (c) { return c.category === 'error'; })
        console.log(errorBreadcrumbs)

        expect(errorBreadcrumbs.length).toEqual(1)
        expect(errorBreadcrumbs[0].message).toMatch('Error');
        expect(errorBreadcrumbs[0].category).toEqual('error');
        expect(errorBreadcrumbs[0].metadata).toEqual(jasmine.objectContaining({
          message: 'expected message',
          name: 'Error',
          stack: results.error.stack
        }));
        done();
      })
      .catch(done);
  });

  it('sends window.onunhandledrejection breadcrumbs when rejection is an Error', function (done) {
    if (!('onunhandledrejection' in window)) { pending(); }

    sandbox
      .run(function () {
        results.error = new Error('expected message');
        var myPromise = new Promise(function (resolve, reject) {
          reject(results.error);
        });
        myPromise.then(function () {
          // noop
        });
      })
      .then(function (results) {
        expect(results.notices.length).toEqual(1);
        expect(results.notices[0].breadcrumbs.trail).toBeArray();

        const errorBreadcrumbs = results.notices[0].breadcrumbs.trail.filter(function (c) { return c.category === 'error'; })

        expect(errorBreadcrumbs.length).toEqual(1);
        expect(errorBreadcrumbs[0].message).toEqual('window.onunhandledrejection: Error');
        expect(errorBreadcrumbs[0].category).toEqual('error');
        expect(errorBreadcrumbs[0].metadata).toEqual(jasmine.objectContaining({
          message: 'UnhandledPromiseRejectionWarning: Error: expected message',
          name: 'Error',
          stack: results.error.stack
        }));
        done();
      })
      .catch(done);
  });

  it('skips window.onunhandledrejection breadcrumbs when rejection is not Error', function (done) {
    if (!('onunhandledrejection' in window)) { pending(); }

    sandbox
      .run(function () {
        var myPromise = new Promise(function (resolve, reject) {
          reject('whatever');
        });
        myPromise.then(function () {
          // noop
        });
      })
      .then(function (results) {
        expect(results.notices.length).toEqual(1);
        expect(results.notices[0].breadcrumbs.trail).toBeArray();

        const errorBreadcrumbs = results.notices[0].breadcrumbs.trail.filter(function (c) { return c.category === 'error'; })

        expect(errorBreadcrumbs.length).toEqual(0);
        done();
      })
      .catch(done);
  });
})

describe("Web Worker", function () {
  it('works within a web worker', function (done) {
    let results = []

    if (!window.Worker) {
      console.warn("This browser does not support web workers")
      return done()
    }

    const MyWorker = new Worker("/base/test/integration/worker.js")

    MyWorker.onmessage = (e) => {
      results = e.data

      expect(results.notices.length).toEqual(1);
      expect(results.notices[0].breadcrumbs.trail.length).toEqual(1);
      expect(results.notices[0].breadcrumbs.trail[0].message).toEqual('Honeybadger Notice');
      expect(results.notices[0].breadcrumbs.trail[0].category).toEqual('notice');
      expect(results.notices[0].breadcrumbs.trail[0].metadata).toEqual(jasmine.objectContaining({
        name: 'expected name',
        message: 'expected message',
        stack: jasmine.any(String)
      }));
      expect(results.notices[0].breadcrumbs.trail[0].metadata).not.toEqual(jasmine.objectContaining({
        context: jasmine.anything()
      }));
      done()
    }

    MyWorker.postMessage("")
  })
})

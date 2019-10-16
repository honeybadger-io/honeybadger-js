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
      'setTimeout(' + code.toString() + ');'
    );
  }

  // Use `sandbox.run(function() {})` to execute the function inside
  // the sandboxed environment.
  sandbox.run = function(code) {
    sandboxEval(code);

    return new Promise(function(resolve) {
      setTimeout(function() {
        resolve(sandbox.contentWindow.results);
      });
    });
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
        expect(results.notices[0].breadcrumbs.length).toEqual(1);
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
        expect(results.notices[0].breadcrumbs.length).toEqual(1);
        expect(results.notices[0].breadcrumbs[0].message).toEqual('button#buttonId');
        expect(results.notices[0].breadcrumbs[0].category).toEqual('ui.click');
        done();
      })
      .catch(done);
  });
});

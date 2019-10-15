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

  document.body.appendChild(sandbox);

  return sandbox;
}


describe('browser integration', function() {
  let sandbox;

  beforeEach(function(done) {
    sandbox = createSandbox(done);
  });

  afterEach(function() {
    document.body.removeChild(sandbox);
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
});

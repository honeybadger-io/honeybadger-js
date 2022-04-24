(function(){
  function log() {
    if (window.console) {
      console.log(arguments);
    }
  }
  // eslint-disable-next-line no-undef
  requirejs(['../../dist/browser/honeybadger'], function(Honeybadger) {
    Honeybadger.configure({
      apiKey: prompt('Enter the API key for your Honeybadger project:'),
      debug: true
    });
    log('Attaching event');
    document.getElementById('btn').addEventListener('click', function(){
      log('Failing in event listener...');
      throw new Error('This is a test error raised from an addEventListener callback.');
    });
  });
})();

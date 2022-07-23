let hb = require('../../dist/browser/honeybadger');
hb.configure({
  apiKey: prompt('Enter the API key for your Honeybadger project:'),
  debug: true
});

(function(){
  function log() {
    if (window.console) {
      console.log(arguments);
    }
  }

  window.onload = function(){
    log('Attaching event');
    document.getElementById('btn').addEventListener('click', function(){
      log('Failing in event listener...');
      throw new Error('This is a test error raised from an addEventListener callback.');
    });

    document.getElementById('btn-check-in').addEventListener('click', function(){
      const checkInId = prompt('Enter check-in id:')
      hb.checkIn(checkInId)
    });
  };
})();

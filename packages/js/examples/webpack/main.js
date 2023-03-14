let hb = require('../../dist/browser/honeybadger');
hb.configure({
  apiKey: prompt('Enter the API key for your Honeybadger project:'),
  debug: true
});

(function(){

  window.hb = hb;
  // uncomment this line to if you want to develop and test the user feedback form locally
  // note: you will probably have to run a separate instance of the express example app to serve this route
  // hb.getUserFeedbackSubmitUrl = () => 'http://localhost:3000/feedback-form'

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
  };
})();

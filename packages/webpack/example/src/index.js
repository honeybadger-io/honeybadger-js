const Honeybadger = require('@honeybadger-io/js');

Honeybadger.configure({
  apiKey: (prompt('Enter the API key for your Honeybadger project:')),
})

function notifyButton() {
  const button = document.createElement('button');
  button.innerHTML = 'Honeybadger.notify()'; 
  button.onclick = function() {
    Honeybadger.notify("Test notify from webpack example project")
  };
  return button
}

document.body.appendChild(notifyButton());
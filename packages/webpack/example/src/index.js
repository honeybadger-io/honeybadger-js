import Honeybadger from './hb'

function notifyButton() {
  const button = document.createElement('button');
  button.innerHTML = 'Honeybadger.notify()'; 
  button.onclick = function() {
    Honeybadger.notify('Test notify from webpack example project')
  };
  return button
}

document.body.appendChild(notifyButton());
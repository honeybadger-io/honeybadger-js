/* eslint-disable no-undef */
// background.js
importScripts(chrome.runtime.getURL('vendor/honeybadger.ext.min.js'));
importScripts(chrome.runtime.getURL('error-reporting.js'));

let color = '#3aa757';

chrome.runtime.onInstalled.addListener(() => {
  // in order to catch errors in listeners, we have to wrap them in a try-catch block
  try {
    chrome.storage.sync.set({ color });
    console.log('Default background color set to %cgreen', `color: ${color}`);

    // You can now use Honeybadger functions here
    if (typeof globalThis.Honeybadger !== 'undefined') {
      somethingUndefinedInBackgroundScript(); // This will throw an error
    }
    else {
      console.log('[background.js] Honeybadger is not loaded.');
    }
  }
  catch (error) {
    if (typeof globalThis.Honeybadger !== 'undefined') {
      globalThis.Honeybadger.notify(error);
    }
  }
});

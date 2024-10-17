/* eslint-disable no-undef */
if (typeof globalThis.Honeybadger !== 'undefined') {
  globalThis.Honeybadger.configure({
    apiKey: 'API_KEY',
    environment: 'chrome-extension',
    debug: true
  });
  console.log('[error-reporting.js] Honeybadger is configured.');
}
else {
  console.log('[error-reporting.js] Honeybadger is not loaded.');
}

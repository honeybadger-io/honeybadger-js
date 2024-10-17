console.log('[content.js] Hello from content.js');

if (typeof window.Honeybadger !== 'undefined') {
  console.log('[content.js] Honeybadger is loaded.');
}

// eslint-disable-next-line no-undef
somethingUndefined(); // This will throw an error

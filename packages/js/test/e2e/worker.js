self.importScripts('/dist/browser/honeybadger.js')

self.Honeybadger.configure({
  apiKey: 'integration_sandbox'
});


const results = { notices: [] }

// This is not a great test since it circumvents fetch...but I can't seem to come up with something better.
self.Honeybadger.__transport.send = function (options, payload) {
  results.notices.push(payload);
  return Promise.resolve({ statusCode: 201, body: JSON.stringify({ id: 'test' }) })
};

self.Honeybadger.notify('expected message', { name: 'expected name', stack: 'expected stack' });

onmessage = () => {
  postMessage(results)
}

# Troubleshooting Guide

This is our troubleshooting guide for *honeybadger.js*.

## Before You Start Troubleshooting

1. Make sure you are on the latest version of *honeybadger.js*.
1. Enable the [`debug` config option](https://github.com/honeybadger-io/honeybadger-js#advanced-configuration), and then check the console. You should now see verbose logs from Honeybadger:
    ```
    [Log] [Honeybadger] Initializing honeybadger.js 0.5.1 (honeybadger.min.js, line 1)
    [Log] [Honeybadger] Installing ready handler (honeybadger.min.js, line 1)
    [Log] [Honeybadger] honeybadger.js 0.5.1 ready (honeybadger.min.js, line 1)
    ```

## All Errors Are Not Reported

If *no* errors are reported (even manually via `Honeybadger.notify`):

1. Is the [`apiKey` config option](https://github.com/honeybadger-io/honeybadger-js#advanced-configuration) configured?
1. Is the error ignored via the [`ignorePatterns` config option](https://github.com/honeybadger-io/honeybadger-js#advanced-configuration)?
1. Is the error ignored via a [`beforeNotify` callback](https://github.com/honeybadger-io/honeybadger-js#honeybadgerbeforenotify-add-a-callback-to-be-run-before-an-exception-is-reported)?

## Uncaught Errors Are Not Reported

If you can report errors using `Honeybadger.notify`, but uncaught errors are not automatically reported:

1. Is the `onerror` config option enabled? It must be enabled for uncaught errors to be reported. It is enabled by default.
1. Is Honeybadger's `window.onerror` callback installed? Check `window.onerror` in the console and make sure it originates in honeybadger.js or honeybadger.min.js (or wherever you are hosting our JavaScript). If it doesn't, it's possible some 3rd-party code is overriding our callback.
1. If the error originates in a file hosted on a different domain, is CORs enabled? If you host your assets on a CDN (or if the domain is different from where your HTML is served) you may need to enable CORS on your asset domain for the `window.onerror` errors to be reported. See https://developer.mozilla.org/en/docs/Web/API/GlobalEventHandlers/onerror#Notes for more info. If this is the issue, you should see logs similar to this:
    ```
    [Log] [Honeybadger] Ignoring cross-domain script error.
    ```
1. Does your application or framework handle errors internally? If you're using a framework, search the documentation for "error handling". For example, Ember provides its own `Ember.onerror` callback which you must configure in order for uncaught errors to be reported:
    ```js
    Ember.onerror = function(error) {
      Honeybadger.notify(error);
    };
    ```

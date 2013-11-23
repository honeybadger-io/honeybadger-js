# Honeybadger-js

[![Build
Status](https://travis-ci.org/honeybadger-io/honeybadger-js.png?branch=master&1)](https://travis-ci.org/honeybadger-io/honeybadger-js)

A JavaScript library for integrating apps with the :zap: [Honeybadger Rails Error Notifier](http://honeybadger.io).

## A quick disclaimer

This library is young. So please report bugs, and don't be surprised
when you encounter one :).

## Usage

Locate your public API key on the JavaScript setup tab of your project
settings page.

    Honeybadger.configure({
      api_key: 'your public api key'
    });

    try {
      ...error producing code...
    } catch(e) {
      Honeybadger.notify(e);
    }

## Advanced Configuration

`Honeybadger.configure` may be called multiple times to set/update
configuration options. Existing configuration will be merged. In most
cases configuration will be set once, however the `action` and
`component` options may change semi-frequently for client-side
frameworks like Backbone and Ember.

    Honeybadger.configure({
      // Honeybadger API key (required)
      api_key: '',

      // Collector Host
      host: 'api.honeybadger.io',

      // Use SSL?
      ssl: true,

      // Project root
      project_root: 'http://my-app.com',

      // Environment
      environment: 'production',

      // Component (optional)
      component: '',

      // Action (optional)
      action: ''

      // Should unhandled (window.onerror) notifications be sent?
      onerror: false

      // Disable notifications?
      disabled: false
    });

## Sending Custom Data

Honeybadger allows you to send custom data using
`Honeybadger.setContext` And `Honeybadger.resetContext`:

    // On load
    Honeybadger.setContext({
      user_id: '<%= current_user.id %>'
    });

    // Later
    Honeybadger.setContext({
      backbone_view: 'tracks'
    });

    // Honeybadger.context => { user_id: 1, backbone_view: 'tracks' }

    Honeybadger.resetContext({
      some_other_data: 'foo'
    });

    // Honeybadger.context == { some_other_data: 'foo' }

You can also add context to a specific exception by passing an
associative array to the `notify` method. Global context will be
merged locally:

    Honeybadger.setContext({
      user_id: '<%= current_user.id %>'
    });

    try {
      ...error producing code...
    } catch(e) {
      Honeybadger.notify(e, { context: { some_other_data: 'foo' } });
    }

    // Honeybadger.context == { user_id: 1 }

## Before notification handlers

Passing a function to `Honeybadger.beforeNotify` will add the function
to a list of before notify handlers. If the function includes a
parameter, the `Notice` object will be passed as an argument.  Multiple
handlers may be added in this fashion:

```javascript
// See src/notice.coffee options available on Notice class
Honeybadger.beforeNotify(function(notice) {
  notice.message = 'My custom message';
});
```

To halt notification, return false from any `beforeNotify` handler:

```javascript
Honeybadger.beforeNotify(function(notice) {
  if (notice.class == 'MyCustomError') return false;
});
```

## Unhandled errors via (window.onerror)

By default, honeybadger-js does not track unhandled errors. This is
because `window.onerror` is a very limited method of error handling, and
does not usually yield useful information. It is our official
recommendation to always use try/catch explicitly to notify Honeybadger.
If you still want to automatically catch errors via `window.onerror`,
you can set the `onerror` configuration option to true:

    Honeybadger.configure({
      api_key: 'your public api key',
      onerror: true
    });

## Contributing

1. Fork it.
2. Create a topic branch `git checkout -b my_branch`
3. Commit your changes `git commit -am "Boom"`
3. Push to your branch `git push origin my_branch`
4. Send a [pull request](https://github.com/honeybadger-io/honeybadger-js/pulls)

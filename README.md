# Honeybadger Client Side Javascript Library

[![Build
Status](https://travis-ci.org/honeybadger-io/honeybadger-js.png?branch=master&1)](https://travis-ci.org/honeybadger-io/honeybadger-js)

A JavaScript library for integrating apps with the :zap: [Honeybadger Rails Error Notifier](http://honeybadger.io).

## Upgrading

It is recommended that you use our CDN, as outlined under
[installation](#installation). The API is 100% backwards compatible, so no other
code changes are required.

*Note: 0.1 and 0.2 make significant improvements to error grouping. As a result,
new errors may be grouped differently than old.*

## Installation

Place the following code between the `<head></head>` tags of your page:

```html
<script src="//js.honeybadger.io/v0.3/honeybadger.min.js" type="text/javascript"></script>
<script type="text/javascript">
  Honeybadger.configure({
    api_key: 'project api key',
    environment: 'production'
  });
</script>
```

## Basic Usage

To catch an error and notify Honeybadger:

```javascript
try {
  // ...error producing code...
} catch(e) {
  Honeybadger.notify(e);
}
```

JavaScript often uses generic class names -- such as `Error` -- which are uninformative and also cause unrelated errors to be grouped together. To get around this issue it's a good practice to send a custom error class when notifying Honeybadger:

```javascript
try {
  // ...error producing code...
} catch(e) {
  Honeybadger.notify(e, 'DescriptiveClass');
}
```

## Catching errors in callbacks

`Honeybadger.wrap` takes an anonymous function as it's argument and returns a new function which is wrapped in a try/catch which reports any errors to Honeybadger. You can use it like this:

```javascript
Honeybadger.wrap(function(){
  throw "oops";
})();
```

You can also omit the () on the end (which immediately calls the returned function) and use it to wrap your callbacks, like so:

```javascript
$(document).on("click", "#myElement", Honeybadger.wrap(function(){ throw "oops"; }));
```

Please note that with `Honeybadger.wrap` the default class name is always reported as there is no way differentiate between different types of errors.

## Sending Custom Data

Honeybadger allows you to send custom data using
`Honeybadger.setContext` And `Honeybadger.resetContext`:

```javascript
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
```

You can also add context to a specific exception by passing an
associative array to the `notify` method. Global context will be
merged locally:

```javascript
Honeybadger.setContext({
  user_id: '<%= current_user.id %>'
});

try {
  // ...error producing code...
} catch(e) {
  Honeybadger.notify(e, { context: { some_other_data: 'foo' } });
}

// Honeybadger.context == { user_id: 1 }
```

## Notification handlers

Passing a function to `Honeybadger.beforeNotify` will add the function
to a list of before notify handlers. If the function includes a
parameter, the `Notice` object will be passed as an argument.  Multiple
handlers may be added in this fashion:

```javascript
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

### Notice Attributes

The following notice attributes may be modified by your notification handlers:

* stack - The stack trace
* class - The exception class name
* message - The error message
* url - The current url
* project_root - The root url
* environment - Name of the environment. example: "production"
* component - Similar to a rails controller name. example: "users"
* action - Similar to a rails action name. example: "create"
* fingerprint - A unique fingerprint, used to customize grouping of errors in Honeybadger.
* context - The context object.

## Sourcemaps

Honeybadger can automatically un-minify your code if you provide a [sourcemap](http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/) along with your minified JavaScript files.

In order to make this work you must include a special comment at the bottom of your minified file which points to the corresponding sourcemap file. To see what this comment should look like, [see the comment at the bottom of honeybadger.js](https://js.honeybadger.io/v0.3/honeybadger.min.js). If you upload the original source files along with the sourcemap, Honeybadger will link to those files when displaying the stack trace.

All files must be publically accessible online so that Honeybadger's servers can download and parse them. For the full specification, see the [Source Map Revision 3 Proposal](https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit).

### Linking stack traces to source files

Honeybadger supports an optional `sourceRoot` comment, which should point to the root path of the original source files online. For example:

```js
// ...minified code...
//# sourceMappingURL=application.min.js.map
//# sourceRoot=https://sources.my-domain.com/src
```

This option may also be specified as a top-level key in the JSON sourcemap file itself:

```js
{
  "sourceRoot" : "https://sources.my-domain.com/src",
  // ...sourcemap...
}
```

To customize this setting *just* for Honeybadger, use `honeybadgerSourceRoot` instead.

#### Linking stack traces to GitHub

If you're using the GitHub integration, you can also link to source files on GitHub by substituting a special `[PROJECT_ROOT]` token for the root of your GitHub repository:

```js
// ...minified code...
//# sourceMappingURL=honeybadger.min.js.map
//# honeybadgerSourceRoot=[PROJECT_ROOT]/src
```

This is the only situation in which the source root is not required to be a valid URL.

## Unhandled errors via (window.onerror)

By default, honeybadger.js does not track unhandled errors. This is
because `window.onerror` is a very limited method of error handling, and
does not usually yield useful information. It is our official
recommendation to always use try/catch explicitly to notify Honeybadger.
If you still want to automatically catch errors via `window.onerror`,
you can set the `onerror` configuration option to true:

```javascript
Honeybadger.configure({
  api_key: 'project api key',
  onerror: true
});
```

## Configuration

`Honeybadger.configure` may be called multiple times to set/update
configuration options. Existing configuration will be merged. In most
cases configuration will be set once, however the `action` and
`component` options may change semi-frequently for client-side
frameworks like Angular or Ember.

```javascript
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
  action: '',

  // Should unhandled (window.onerror) notifications be sent?
  onerror: false,

  // Disable notifications?
  disabled: false,

  // Timeout (in milliseconds) when making requests.
  timeout: false
});
```

## Contributing

1. Fork it.
2. Create a topic branch `git checkout -b my_branch`
3. Commit your changes `git commit -am "Boom"`
3. Push to your branch `git push origin my_branch`
4. Send a [pull request](https://github.com/honeybadger-io/honeybadger-js/pulls)

### Running the tests

To run the test suite, enter `make test` into the console. 

### License

The Honeybadger gem is MIT licensed. See the [MIT-LICENSE](https://raw.github.com/honeybadger-io/honeybadger-js/master/MIT-LICENSE) file in this repository for details. 


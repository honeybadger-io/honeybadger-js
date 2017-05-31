# Honeybadger Client-Side Javascript Library

[![Build
Status](https://travis-ci.org/honeybadger-io/honeybadger-js.png?branch=master&1)](https://travis-ci.org/honeybadger-io/honeybadger-js)

A client-side JavaScript library for integrating apps with the :zap: [Honeybadger Error Notifier](http://honeybadger.io). For server-side javascript, check out our [NodeJS library](https://github.com/honeybadger-io/honeybadger-node).

## Getting Started

### 1. Include the JS library

#### Globally

Place the following code between the `<head></head>` tags of your page:

```html
<script src="//js.honeybadger.io/v0.4/honeybadger.min.js" type="text/javascript" data-api_key="project api key" data-environment="production"></script>
```

Honeybadger may also be configured via JavaScript:

```javascript
<script type="text/javascript">
  Honeybadger.configure({
    apiKey: 'project api key',
    environment: 'production'
  });
</script>
```

Here's a video walkthrough of a basic, global installation:

[![Using Honeybadger with Javascript](https://embed-ssl.wistia.com/deliveries/0881945df2b2413bf15aba6fc853a7b477218048.jpg?image_play_button=true&image_play_button_color=7b796ae0&image_crop_resized=150x84)](https://honeybadger.wistia.com/medias/8wkvbipxxj)

#### Installing via Node.js

```
npm install honeybadger-js --save
```

#### Installing via Bower

```sh
bower install honeybadger --save
```

#### Browserify/Webpack (CommonJS)

```sh
var Honeybadger = require("path/to/honeybadger");
Honeybadger.configure({
  apiKey: 'project api key',
  environment: 'production'
});
```

- See an [example browserify + honeybadger.js project](https://github.com/honeybadger-io/honeybadger-js/tree/master/examples/browserify).
- See an [example webpack + honeybadger.js project](https://github.com/honeybadger-io/honeybadger-js/tree/master/examples/webpack).

#### RequireJS (AMD)

```sh
requirejs(["path/to/honeybadger"], function(Honeybadger) {
  Honeybadger.configure({
    apiKey: 'project api key',
    environment: 'production'
  });
});
```

- See an [example requirejs + honeybadger.js project](https://github.com/honeybadger-io/honeybadger-js/tree/master/examples/requirejs).

#### Rails Assets

*Note: First, make sure you use bundler >= 1.8.4.*

Add the following to your Gemfile:

```ruby
source 'https://rails-assets.org' do
  gem 'rails-assets-honeybadger'
end
```

Add the following to application.js:

```javascript
//= require honeybadger

Honeybadger.configure({
  apiKey: 'project api key',
  environment: 'production'
});
```

### 2. Start reporting exceptions

By default Honeybadger will report all uncaught exceptions automatically using our `window.onerror` handler.

You can also manually notify Honeybadger of errors and other events in your application code:

```javascript
try {
  // ...error producing code...
} catch(error) {
  Honeybadger.notify(error);
}
```

See the [full documentation](https://github.com/honeybadger-io/honeybadger-js#honeybadgernotify-send-an-exception-to-honeybadger) for the `notify` method for more examples.

## Advanced Configuration

You can set configuration options by using the `Honeybadger.configure` function. All of the available options are shown below:

```javascript
Honeybadger.configure({
  // Output Honeybadger debug messages to the console
  debug: false,

  // Honeybadger API key (required)
  apiKey: '',

  // Collector Host
  host: 'api.honeybadger.io',

  // Use SSL?
  ssl: true,

  // Project root
  projectRoot: 'http://my-app.com',

  // Environment
  environment: 'production',

  // Component (optional)
  component: '',

  // Action (optional)
  action: '',

  // Ignore Patterns (optional)
  // Array of error messages as regexes that should be ignored
  ignorePatterns: [/known\ error/i],

  // Should unhandled (window.onerror) notifications be sent?
  onerror: true,

  // Disable notifications?
  disabled: false,

  // Send notifications asynchronously
  async: true
});
```

You can call `Honeybadger.configure` as many times as you like. The existing configuration data will be merged with any new data you provide. This is especially useful for changing the `action` and `component` values inside of single-page apps.

### Configuring via data attributes

The global Honeybadger instance may also be configured via data attributes on the script tag which loads honeybadger.js:

```html
<script src="honeybadger.js" type="text/javascript" data-component="pages" data-action="index" ...></script>
```

## Public Interface

### `Honeybadger.notify()`: Send an exception to Honeybadger

If you've caught an exception and want to send it to Honeybadger, this is the method for you.

#### Examples:

```javascript
try {
  // ...error producing code...
} catch(error) {
  Honeybadger.notify(error);
}
```

JavaScript often uses generic class names -- such as `Error` -- which are uninformative and also cause unrelated errors to be grouped together. To get around this issue it's a good practice to send a custom error class when notifying Honeybadger:

```javascript
Honeybadger.notify(error, 'DescriptiveClass');
```

You can also set or override other optional data which is reported with the error:

```javascript
Honeybadger.notify(error, {
  message: 'My custom message',
  name: 'DescriptiveClass',
  component: 'badgers',
  action: 'show',
  context: { badgerId: 1 },
  fingerprint: 'This unique string will group similar errors together',
  environment: 'production',
  projectRoot: 'https://www.example.com/',
  params: { key: 'value' },
  cookies: { key: 'value' } // May also be sent as a string in the document.cookie "foo=bar;bar=baz" format.
});
```

Finally, you can notify Honeybadger of anything, even if you don't have an error object:

```javascript
Honeybadger.notify('Badgers!');
Honeybadger.notify('Badgers!', { ... });
Honeybadger.notify('Badgers!', 'CustomClass');
Honeybadger.notify('Badgers!', 'CustomClass', { ... });
Honeybadger.notify({
  message: 'Badgers!',
  name: 'CustomClass',
  ...
});
```

A stacktrace will be generated for you (when possible) if you do not provide an error object.

---

### `Honeybadger.wrap()`: Wrap the given function in try/catch and report any exceptions

It can be a pain to include try/catch blocks everywhere in your app. A slightly nicer option is to use `Honeybadger.wrap`. You pass it a function. It returns a new function which wraps your existing function in a try/catch block.

#### Examples:

```javascript
Honeybadger.wrap(function(){
  throw "oops";
})();
```

Note that `wrap` returns a function. This makes it easy to use with event handlers, as in the example below:

```javascript
$(document).on("click", "#myElement", Honeybadger.wrap(function(){ throw "oops"; }));
```

---

### `Honeybadger.setContext()`: Set metadata to be sent if an exception occurs

Javascript exceptions are pretty bare-bones. You probably have some additional data that could make them a lot easier to understand - perhaps the name of the current Angular view, or the id of the current user. This function lets you set context data that will be sent if an error should occur.

You can call `setContext` as many times as you like. New context data will be merged with the existing data.

#### Examples:

```javascript
// On load
Honeybadger.setContext({
  user_id: 123
});

// Later
Honeybadger.setContext({
  backbone_view: 'tracks'
});

// The context now contains { user_id: 123, backbone_view: 'tracks' }
```
---

### `Honeybadger.resetContext()`: Clear context metadata

If you've used `Honeybadger.setContext` to store context data, you can clear it with `Honeybadger.resetContext`.

#### Example:

```javascript
// Set the context to {}
Honeybadger.resetContext();

// Clear the context, then set it to `{ user_id: 123 }`
Honeybadger.resetContext({
  user_id: 123
});
```

---

### `Honeybadger.beforeNotify()`: Add a callback to be run before an exception is reported

Passing a function to `Honeybadger.beforeNotify` will add the function
to a list of before notify handlers. If the function includes a
parameter, the `Notice` object will be passed as an argument.  Multiple
handlers may be added in this fashion:


#### Examples

```javascript
Honeybadger.beforeNotify(function(notice) {
  notice.message = 'My custom message';
});


// To halt notification, return false from any `beforeNotify` handler:
Honeybadger.beforeNotify(function(notice) {
  if (notice.class == 'MyCustomError') return false;
});
```

The following notice attributes may be modified by your notification handlers:

* stack - The stack trace
* name - The exception class name
* message - The error message
* url - The current url
* projectRoot - The root url
* environment - Name of the environment. example: "production"
* component - Similar to a rails controller name. example: "users"
* action - Similar to a rails action name. example: "create"
* fingerprint - A unique fingerprint, used to customize grouping of errors in Honeybadger.
* context - The context object.
* params - An object of request parameters.
* cookies - An object of cookie key/values. May also be sent as a string in the document.cookie "foo=bar;bar=baz" format.

---


### `Honeybadger.configure()`: Set configuration values

The `configure` method takes an object containing config values. Its return value is unspecified.

#### Examples:

```javascript
Honeybadger.configure({apiKey: "adlkjfljk"});
```


---


### `Honeybadger.factory()`: create a new client instance.

The `factory` method returns a new instance of Honeybadger which can be configured differently than the global/singleton instance.

#### Examples:

```javascript
var other_hb = Honeybadger.factory({apiKey: "zxcvbnm"});
other_hb.notify("This will go to an alternate project.");
```

## Sourcemaps

Honeybadger can automatically un-minify your code if you provide a [sourcemap](http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/) along with your minified JavaScript files.

To do this, you'll add a special comment at the bottom of your minified JS. It tells us where to find your sourcemap. For example:

```js
// ...minified code...
//# sourceMappingURL=application.min.js.map
```

The sourcemap URL needs to be a valid URL accessible to the public.

For more information on sourcemaps, check out the [Source Map Revision 3 Proposal](https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit).


### Linking stack traces to source files

If you'd like to be able to jump from the Honeybadger backtrace to your unminified source file, just tell us where to find your unminified files using the `sourceRoot` option.

`sourceRoot` is the root URL for your unminified source files. To set it, you can use another magic comment:


```js
// ...minified code...
//# sourceRoot=https://sources.my-domain.com/src
```

This option may also be specified as a top-level key in the JSON sourcemap file itself:

```js
{
  "sourceRoot" : "https://sources.my-domain.com/src",
  // ...sourcemap...
}
```

If providing the `sourceRoot` option fouls up other tools in your toolchain, you can alternatively use `honeybadgerSourceRoot`.

#### Using GitHub

If you're using Honeybadger's GitHub integration, you can link to source files on GitHub by substituting a special `[PROJECT_ROOT]` token for the root of your GitHub repository:

```js
// ...minified code...
//# sourceMappingURL=honeybadger.min.js.map
//# honeybadgerSourceRoot=[PROJECT_ROOT]/src
```

This is the only situation in which the source root is not required to be a valid URL.

#### Authentication

Requests sent from Honeybadger servers to download sourcemaps and related-files include a secret token in the `Honeybadger-Token` header, which may be used to authenticate requests from Honeybadger.

To find your `Honeybadger-Token` token, visit your project settings page in Honeybadger and click on the "Sourcemaps" tab.

One exception is direct links from the Honeybadger UI (such as when displaying links in backtraces); these cannot be authenticated.

## Sending cookies by default

To automatically send cookies with all error reports, use the following `::beforeNotify` handler:

```js
Honeybadger.beforeNotify(function(err){
  err.cookies = document.cookie;
  return true;
})
```

## window.onerror

Honeybadger.js automatically reports uncaught exceptions from window.onerror. To
disable notifications for uncaught exceptions, set the `onerror` option to
`false`.

```javascript
Honeybadger.configure({
  apiKey: 'project api key',
  onerror: false
});
```

If you host your assets on a CDN (or if the domain is different from where your HTML is served) you may need to enable CORS on your asset domain for the `window.onerror` errors to be reported. See https://developer.mozilla.org/en/docs/Web/API/GlobalEventHandlers/onerror#Notes for more info.

## Contributing

1. Fork it.
2. Create a topic branch `git checkout -b my_branch`
3. Commit your changes `git commit -am "Boom"`
3. Push to your branch `git push origin my_branch`
4. Send a [pull request](https://github.com/honeybadger-io/honeybadger-js/pulls)

### Development

First, install the required npm packages with `npm install`. After that you can run the dev server with `grunt dev`; this will launch a development server at *http://127.0.0.1:9999*. It will also run the test suite automatically when files change.

To run the test suite by itself, use `grunt jasmine`.

### License

The Honeybadger gem is MIT licensed. See the [MIT-LICENSE](https://raw.github.com/honeybadger-io/honeybadger-js/master/MIT-LICENSE) file in this repository for details.

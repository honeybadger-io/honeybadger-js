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

## Contributing

1. Fork it.
2. Create a topic branch `git checkout -b my_branch`
3. Commit your changes `git commit -am "Boom"`
3. Push to your branch `git push origin my_branch`
4. Send a [pull request](https://github.com/honeybadger-io/honeybadger-js/pulls)

honeybadger-js is inspired by [saucer, the coffeescript boilerplate](https://github.com/jbenet/saucer).

![def](http://static.benet.ai/skitch/saucer-20121208-004907.png)

Saucer is an opinionated template project for coffee/javascript development.
It gets you up and running with the following tools:

* [coffeescript](http://coffeescript.org/) for awesomeness
* [grunt](http://gruntjs.com/) for the task-based build system
* [npm](http://npmjs.org/) for installing other packages
* [jasmine](http://pivotal.github.com/jasmine/) for tests
  * [jasmine-runner](https://github.com/jasmine-contrib/grunt-jasmine-runner)
    for the commandline (with [phantomjs](http://phantomjs.org/))
  * [jasmine-spec-server](https://github.com/jbenet/grunt-jasmine-spec-server)
    for the webserver
* [closure compiler](https://developers.google.com/closure/) for dependencies
    and minification

and the frontend libs:

* [underscore](http://underscorejs.org) for awesome utilities

### install

#### clone the source

    git clone https://github.com/jbenet/saucer.git my-project
    cd my-project

#### install dependencies

* [node and npm](http://nodejs.org/download/)
    or in osx:

        brew install nodejs

* [phantomjs](http://phantomjs.org/)
    or in osx:

        brew install phantomjs

* [closure compiler](http://code.google.com/p/closure-compiler/downloads/list)
    or in osx:

        brew install closure-compiler

#### setup google closure

Move (or create a symlink to) the closure compiler jar to
`lib/closure/compiler.jar`. For example, in osx:

    % mv ~/Downloads/compiler-latest/compiler.jar lib/closure/.

or

    % ln -s /usr/local/Cellar/closure-compiler/20120917/libexec/build/compiler.jar lib/closure/.

Initialize google closure-tools submodule:

    % git submodule init
    % git submodule update

#### install node modules

    % npm install

### source tree

Saucer organizes the code thus:

    ├── Gruntfile.coffee - the grunt task file
    ├── README.md        - this file
    ├── build            - the build directory, for compiled code
    ├── coffee           - coffeescript code
    │   ├── src          - coffeescript source files
    │   └── test         - coffeescript test files
    ├── js               - javascript code (generated from coffee/)
    │   ├── deps.js      - generated dependencies file (closure)
    │   ├── src          - javascript source files
    │   └── test         - javascript test files
    ├── lib              - libraries
    │   └── closure      - closure library + compiler
    ├── node_modules     - npm installed modules
    └── package.json     - package info

### grunt tasks

Available tasks (ignore others):

        coffee  Compile CoffeeScript files (coffee/ to js/)
          deps  Generates file dependencies (js/deps.js)
          test  Runs jasmine tests in the commandline.
        server  Runs jasmine tests in a webserver.
       compile  Closure compiles the source (js/src/).
       default  Alias for "compile" task.
         watch  Watches coffee/ and re-runs "deps"
         clean  Clear files and folders (js/, build/)

### testing

You can run the tests from the commandline (using phantomjs):

    grunt --config Gruntfile.coffee test

You can also run the tests in the browser:

    grunt --config Gruntfile.coffee server

## License

Honeybadger-js is Copyright 2013 © Honeybadger Industries LLC. It is free software, and may be redistributed under the terms specified in the MIT-LICENSE file.

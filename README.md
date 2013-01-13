# Honeybadger-js

A JavaScript library for integrating apps with the :zap: [Honeybadger Rails Error Notifier](http://honeybadger.io).

## Usage

        Honeybadger.configure({
          api_key: 'your api key'
        });

        try {
          ...error producing code...
        } catch(e) {
          Honeybadger.notify(e);
        }

## Development

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

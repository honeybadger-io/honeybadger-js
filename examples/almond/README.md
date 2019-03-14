# Honeybadger almond Example

Follow these steps to run the example:

1. Download r.js: `curl https://requirejs.org/docs/release/2.3.6/r.js > r.js`
2. Download almond.js: `curl https://raw.githubusercontent.com/requirejs/almond/latest/almond.js > almond.js`
3. Run the optimizer (this will result in a main-built.js file being created):
    ```
    node r.js -o baseUrl=. name=almond include=main out=main-built.js wrap=true
    ```
4. Visit *index.html* in a browser and check out the development console for log
   messages.

note: for the error to be reported you need to access index.html through a valid host such as `127.0.0.1` or `localhost`. See [Development](https://github.com/honeybadger-io/honeybadger-js#development) to use our built-in development server.

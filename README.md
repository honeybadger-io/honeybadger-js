# Honeybadger Client Side Javascript Library

[![Build
Status](https://travis-ci.org/honeybadger-io/honeybadger-js.png?branch=master&1)](https://travis-ci.org/honeybadger-io/honeybadger-js)

A JavaScript library for integrating apps with the :zap: [Honeybadger Rails Error Notifier](http://honeybadger.io).

## Upgrading from 0.0.x

It is recommended that you use our CDN, as outlined under
[installation](#installation). The API is 100% backwards compatible, so no other
code changes are required.

*Note: 0.1 makes significant improvements to error grouping. As a result, new
errors may be grouped differently than old.*

## Installation

Place the following code between the `<head></head>` tags of your page:

```html
<script src="//js.honeybadger.io/v0.1/honeybadger.min.js" type="text/javascript"></script>
<script type="text/javascript">
  Honeybadger.configure({
    api_key: 'public api key',
    environment: 'production'
  });
</script>
```

See the documentation for usage examples.

## Documentation

[View the Documentation](http://docs.honeybadger.io/article/66-client-side-javascript-documentation)

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


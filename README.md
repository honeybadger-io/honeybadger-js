# Honeybadger Client-Side Javascript Library

![Node CI](https://github.com/honeybadger-io/honeybadger-js/workflows/Node%20CI/badge.svg)
[![npm version](https://badge.fury.io/js/honeybadger-js.svg)](https://badge.fury.io/js/honeybadger-js)

A client-side JavaScript library for integrating apps with the :zap: [Honeybadger Error Notifier](http://honeybadger.io). For server-side javascript, check out our [NodeJS library](https://github.com/honeybadger-io/honeybadger-node).

## Documentation and Support

For comprehensive documentation and support, [check out our documentation site](http://docs.honeybadger.io/lib/javascript/index.html).

## Changelog

See https://github.com/honeybadger-io/honeybadger-js/blob/master/CHANGELOG.md

## Contributing

1. Fork it.
2. Create a topic branch `git checkout -b my_branch`
3. Commit your changes `git commit -am "Boom"`
3. Push to your branch `git push origin my_branch`
4. Send a [pull request](https://github.com/honeybadger-io/honeybadger-js/pulls)

## Development

1. Run `npm install`.
2. To run the test suite by itself, use `npm test`.
3. To run the tests across all supported platforms, set up a [BrowserStack](https://www.browserstack.com/)
account and use `BROWSERSTACK_USERNAME=your_username BROWSERSTACK_ACCESS_KEY=your-access-key npm run test:ci`.

## Releasing

Releasing is done with two commands: `npm version` and `npm publish`. **Both
commands should be used with care.** The `npm publish` command publishes to NPM
**and** to our *js.honeybadger.io* CDN (hosted on AWS via S3/CloudFront).

For the CDN release, make sure you have the following environment variable
available in your shell:

```
export HONEYBADGER_JS_S3_BUCKET=honeybadger-js
export HONEYBADGER_DISTRIBUTION_ID=cloudfront-id
```

AWS credentials are read from *~/.aws/credentials*, using the default profile.

To perform a full release:

1. With a clean working tree, use `npm version [new version]` to bump the version, commit the
   changes, tag the release, and push to GitHub. See `npm help version` for
   documentation.

2. To publish the release, use `npm publish`. See `npm help publish` for
   documentation.

If the CDN release fails for some reason (bad AWS credentials, for instance),
re-run the release manually with `npm run release-cdn`.

## License

The Honeybadger gem is MIT licensed. See the [MIT-LICENSE](https://raw.github.com/honeybadger-io/honeybadger-js/master/MIT-LICENSE) file in this repository for details.

---
<p><a href="https://www.browserstack.com/"><img src="/browserstack-logo.png" width="150"></a><br>
 <small>We use <a href="https://www.browserstack.com/">BrowserStack</a> to run our automated integration tests on multiple platforms in CI.</small></p>

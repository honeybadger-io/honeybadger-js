# Honeybadger React.js Integration

[![Build Status](https://img.shields.io/endpoint.svg?url=https%3A%2F%2Factions-badge.atrox.dev%2Fhoneybadger-io%2Fhoneybadger-react%2Fbadge&style=flat)](https://actions-badge.atrox.dev/honeybadger-io/honeybadger-react/goto)
[![npm version](https://badge.fury.io/js/%40honeybadger-io%2Freact.svg)](https://badge.fury.io/js/%40honeybadger-io%2Freact)
> [React.js integration for Honeybadger.io](https://www.honeybadger.io/for/javascript/?utm_source=github&utm_medium=readme&utm_campaign=react&utm_content=React.js+integration+for+Honeybadger.io)

## Documentation and Support

For comprehensive documentation and support, [check out our documentation site](https://docs.honeybadger.io/lib/javascript/index.html).

The documentation includes a detailed [React integration guide](https://docs.honeybadger.io/lib/javascript/integration/react.html)

## Project Goals

The goal is to provide an idiomatic, simple integration of Honeybadger's
exception monitoring service with React.js applications.

## Project Status

This version is considered suitable for preview.

## Limitations

Honeybadger-react hooks in to the error handler in React. This means we only
notify Honeybadger of React context for errors that React handles. Some
errors inside React code may propagate to the window onerror handler
instead.

In those cases, Honeybadger Javascript library's default error notifier
is invoked, which will contain a stack trace but none of the React
variables.

## Key Assumptions

This project is built using create-react-library with rollup and generates
artifacts in commonjs, esm and umd formats. It's possible
your own build environment may be just different enough to require some
adjustments. If you find that our artifacts don't quite meet your needs,
please [file an issue on GitHub](https://github.com/honeybadger-io/honeybadger-react/issues).

## Example app

There's a minimal implementation of a honeybadger-react integration in the ./example
folder. If you want to contribute a patch to honeybadger-react, it can be useful to have
the demo app running.

To run it, issue these commands from your shell:

```bash
cd example
npm install
REACT_APP_HONEYBADGER_API_KEY=b425b636 npm run start
```

This will serve the demo app with hot reload at localhost:3000

For a detailed explanation on how hot reloading works, check out the [documentation](https://webpack.js.org/concepts/hot-module-replacement/).

## Changelog

See https://github.com/honeybadger-io/honeybadger-react/blob/master/CHANGELOG.md
Changelog is automatically generated with [our release automation process](#release-automation).

## Contributing

1. Fork it.
2. Create a topic branch `git checkout -b my_branch`
3. Commit your changes `git commit -am "Boom"`
3. Push to your branch `git push origin my_branch`
4. Send a [pull request](https://github.com/honeybadger-io/honeybadger-react/pulls)

## Development

``` bash
# install dependencies
npm install

# build for production
npm run build

# run unit tests
npm test

# automatically continuously rebuild the dist/ artifacts with hot reload when developing
npm run start
```

## Releasing

1. With a clean working tree, use `npm version [new version]` to bump the version,
   commit the changes, tag the release, and push to GitHub. See `npm help version`
   for documentation.
2. To publish the release, use `npm publish`. See `npm help publish` for
   documentation.

### Release Automation

We use [Ship.js](https://github.com/algolia/shipjs) to automate releasing.

Ship.js creates a PR once per week when unreleased changes are present. You can also trigger a release PR by saying "@shipjs prepare" in any issue or pull request comment on GitHub.

#### Troubleshooting a failed Ship.js release

If a ship.js release fails, you need to revert the release commit and delete the release branch (e.g `releases/v1.1.0`)
Then, you can debug the issue by simulating the release process locally (`npm run release -- --dry-run --yes --no-browse`).

### License

*honeybadger-react* is MIT licensed. See the [LICENSE](https://raw.github.com/honeybadger-io/honeybadger-react/master/LICENSE) file in this repository for details.

# Honeybadger Vue.js Integration
[![Build Status](https://github.com/honeybadger-io/honeybadger-vue/actions/workflows/nodejs.yml/badge.svg)](https://github.com/honeybadger-io/honeybadger-vue/actions/workflows/nodejs.yml)
[![npm version](https://badge.fury.io/js/%40honeybadger-io%2Fvue.svg)](https://badge.fury.io/js/%40honeybadger-io%2Fvue)
> [Vue.js integration for Honeybadger.io](https://www.honeybadger.io/for/javascript/?utm_source=github&utm_medium=readme&utm_campaign=vue&utm_content=Vue.js+integration+for+Honeybadger.io)

**Note:** Since v3.2 release of this project, both Vue.js v2.x and v3.x are supported!

## Documentation and Support

For comprehensive documentation and support, [check out our documentation site](https://docs.honeybadger.io/lib/javascript/index.html).

The documentation includes detailed Vue Integration Guides, both for Vue.js [v2.x](https://docs.honeybadger.io/lib/javascript/integration/vue2.html) and [v3.x](https://docs.honeybadger.io/lib/javascript/integration/vue3.html).

## Project Goals

The goal is to provide an idiomatic, simple integration of Honeybadger's
exception monitoring service with Vue.js applications.

## Project Status

This version is considered suitable for preview.

## Limitations

Honeybadger-vue hooks in to the error handler in Vue. This means we only
notify Honeybadger of Vue context for errors that Vue handles. Some
errors inside Vue code may propagate to the window onerror handler
instead.

In those cases, Honeybadger Javascript library's default error notifier
is invoked, which will contain a stack trace but none of the Vue
variables.

## Key Assumptions

This project is built using a webpack-based Vue template. It's possible
your own build environment may be just different enough to require some
adjustments. If you find that our artifacts don't quite meet your needs,
please [file an issue on GitHub](https://github.com/honeybadger-io/honeybadger-vue/issues).

## Changelog

See https://github.com/honeybadger-io/honeybadger-vue/blob/master/CHANGELOG.md
Changelog is automatically generated with [our release automation process](#release-automation).

## Contributing

1. Fork it.
2. Create a topic branch `git checkout -b my_branch`
3. Commit your changes `git commit -am "Boom"`
3. Push to your branch `git push origin my_branch`
4. Send a [pull request](https://github.com/honeybadger-io/honeybadger-vue/pulls)

## Development

``` bash
# install dependencies
npm install

# Serve the demo app with hot reload at localhost:8080
HONEYBADGER_API_KEY=yourkey npm run dev

# build for production with minification
npm run build

# build for production and view the bundle analyzer report
npm run build --report

# run unit tests
npm run unit

# run all tests
HONEYBADGER_API_KEY=yourkey npm run test:all
```

For a detailed explanation on how things work, check out the [guide](http://vuejs-templates.github.io/webpack/) and [docs for vue-loader](http://vuejs.github.io/vue-loader).

## Releasing

Releasing is done with two commands: `npm version` and `npm publish`. **Both
commands should be used with care.**

To perform a release:

1. With a clean working tree, use `npm version [new version]` to bump the version, commit the
   changes, tag the release, and push to GitHub. See `npm help version` for
   documentation. Make sure to checkout the correct branch (i.e. if you are planning to release a version with other than `latest` dist tag).


2. To publish the release, use `npm publish`. See `npm help publish` for
   documentation. This command will publish the version with the `latest` tag. To publish with a different tag, i.e. `next`, use `npm publish --tag next`.


3. Verify the published version in Versions tab from [here](https://www.npmjs.com/package/@honeybadger-io/vue).

### Release Automation

We use [Ship.js](https://github.com/algolia/shipjs) to automate releasing.

Ship.js creates a PR once per week when unreleased changes are present. You can also trigger a release PR by saying "@shipjs prepare" in any issue or pull request comment on GitHub.

#### Troubleshooting a failed Ship.js release

If a ship.js release fails, you need to revert the release commit and delete the release branch (e.g `releases/v1.1.0`)
Then, you can debug the issue by simulating the release process locally (`npm run release -- --dry-run --yes --no-browse`).

### License

*honeybadger-vue* is MIT licensed. See the [LICENSE](https://raw.github.com/honeybadger-io/honeybadger-vue/master/LICENSE) file in this repository for details.

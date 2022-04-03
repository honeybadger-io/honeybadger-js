# Honeybadger for JavaScript

![Node CI](https://github.com/honeybadger-io/honeybadger-js/workflows/Node%20CI/badge.svg)
[![npm version](https://badge.fury.io/js/%40honeybadger-io%2Fjs.svg)](https://badge.fury.io/js/%40honeybadger-io%2Fjs)
[![deploy](https://img.shields.io/badge/deploy-🛳%20Ship.js-blue?style=flat)](https://github.com/algolia/shipjs)

Universal JavaScript library for integrating apps with the :zap: [Honeybadger Error Notifier](http://honeybadger.io).

❗*Note: The NPM package has been moved to [**@honeybadger-io/js**](https://www.npmjs.com/package/@honeybadger-io/js) starting with v3.0.0. See the [v2-stable](https://github.com/honeybadger-io/honeybadger-js/tree/v2-stable) branch for the [**honeybadger-js**](https://www.npmjs.com/package/honeybadger-js) 2.x package. [Upgrade instructions](https://docs.honeybadger.io/lib/javascript/support/upgrading-to-v3.html)*

## Documentation and Support

For comprehensive documentation and support, [check out our documentation site](http://docs.honeybadger.io/lib/javascript/index.html).

## Changelog

[Conventional Commits](https://www.conventionalcommits.org/) are enforced with a git hook ([husky](https://typicode.github.io/husky) + [commitlint](https://commitlint.js.org/)) in order to automate changelog generation.
[CHANGELOG.md](CHANGELOG.md) is updated when a new version is released (npm run release) with [shipjs](https://community.algolia.com/shipjs/reference/all-config.html#updatechangelog).

## Contributing

1. Fork it.
2. Create a topic branch `git checkout -b my_branch`
3. Commit your changes `git commit -am "Boom"`
4. Push to your branch `git push origin my_branch`
5. Send a [pull request](https://github.com/honeybadger-io/honeybadger-js/pulls)

## Development

1. Run `npm install`.
2. To run unit tests for both browser and server builds: `npm test`. Or separately: `npm run test:browser`, `npm run test:server`.
3. To run integration tests across all supported platforms, set up a [BrowserStack](https://www.browserstack.com/)
account and use `BROWSERSTACK_USERNAME=your_username BROWSERSTACK_ACCESS_KEY=your-access-key npm run test:integration`.
4. To test the TypeScript type definitions: `npm run tsd`.
   
### Bundling and types
This project is _isomorphic_, meaning it's a single library which contains both browser and server builds. It's written in TypeScript, and transpiled and bundled with Rollup. Our Rollup config generates three main files:
1. The server build, which transpiles `src/server.ts` and its dependencies into `dist/server/honeybadger.js`.
2. The browser build, which transpiles `src/browser.ts` and its dependencies into `dist/browser/honeybadger.js`.
3. The minified browser build, which transpiles `src/browser.ts` and its dependencies into `dist/browser/honeybadger.min.js` (+ source maps).

In addition, the TypeScript type declaration for each build is generated into its `types/` directory (ie `dist/browser/types/browser.d.ts` and `dist/server/types/server.d.ts`).

However, since the package is isomorphic, TypeScript users will likely be writing `import * as Honeybadger from '@honeybadger-io/js'` or `import Honeybadger = require('@honeybadger-io/js')` in their IDE. Our `package.json` has ` main` and `browser` fields that determine which build they get, but [there can only be a single type declaration file](https://github.com/Microsoft/TypeScript/issues/29128). So we use an extra file in the project root, `honeybadger.d.ts`, that combines the types from both builds.

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

### Release Automation

We use [Ship.js](https://github.com/algolia/shipjs) to automate releasing. Our [custom Ship.js config](https://github.com/honeybadger-io/honeybadger-js/blob/master/ship.config.js) determines the next release version based on the unreleased section of our [changelog](https://github.com/honeybadger-io/honeybadger-js/blob/master/CHANGELOG.md) ([Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format).

Ship.js creates a PR once per week when unreleased changes are present. You can also trigger a release PR by saying "@shipjs prepare" in any issue or pull request comment on GitHub.

#### Available Commands

- `npm run release` - Calculates the next version and creates a PR via `shipjs prepare`. This can run locally or in CI
- `npx shipjs trigger` - Publish to NPM (usually happens in CI, but can also run locally)

#### GitHub Workflows

- [shipjs-manual-prepare](https://github.com/honeybadger-io/honeybadger-js/blob/master/.github/workflows/shipjs-manual-prepare.yml)
- [shipjs-schedule-prepare](https://github.com/honeybadger-io/honeybadger-js/blob/master/.github/workflows/shipjs-schedule-prepare.yml)
- [shipjs-trigger](https://github.com/honeybadger-io/honeybadger-js/blob/master/.github/workflows/shipjs-trigger.yml)

#### Related Links

- [Our Ship.js config file](https://github.com/honeybadger-io/honeybadger-js/blob/master/ship.config.js)
- [Our Changelog file](https://github.com/honeybadger-io/honeybadger-js/blob/master/CHANGELOG.md)
- [Ship.js on GitHub](https://github.com/algolia/shipjs)
- [Ship.js docs](https://community.algolia.com/shipjs/guide/)
- [More about our unique setup](https://www.joshuawood.net/notes/release-automation-with-ship-js-and-keep-a-changelog)

## License

The Honeybadger gem is MIT licensed. See the [MIT-LICENSE](https://raw.github.com/honeybadger-io/honeybadger-js/master/MIT-LICENSE) file in this repository for details.

---
<p><a href="https://www.browserstack.com/"><img src="/browserstack-logo.png" width="150"></a><br>
 <small>We use <a href="https://www.browserstack.com/">BrowserStack</a> to run our automated integration tests on multiple platforms in CI.</small></p>

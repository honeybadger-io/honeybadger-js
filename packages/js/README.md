# Honeybadger for JavaScript

![Node CI](https://github.com/honeybadger-io/honeybadger-js/workflows/Node%20CI/badge.svg)
[![npm version](https://badge.fury.io/js/%40honeybadger-io%2Fjs.svg)](https://badge.fury.io/js/%40honeybadger-io%2Fjs)
[![npm dm](https://img.shields.io/npm/dm/@honeybadger-io/js)](https://www.npmjs.com/package/@honeybadger-io/js)
[![npm dt](https://img.shields.io/npm/dt/@honeybadger-io/js)](https://www.npmjs.com/package/@honeybadger-io/js)

Universal JavaScript library for integrating apps with the :zap: [Honeybadger Error Notifier](http://honeybadger.io).

## Documentation and Support

For comprehensive documentation and support, [check out our documentation site](http://docs.honeybadger.io/lib/javascript/index.html).

## Development

### Bundling and types
This project is _isomorphic_, meaning it's a single library which contains both browser and server builds. It's written in TypeScript, and transpiled and bundled with Rollup. Our Rollup config generates three main files:
1. The server build, which transpiles `src/server.ts` and its dependencies into `dist/server/honeybadger.js`.
2. The browser build, which transpiles `src/browser.ts` and its dependencies into `dist/browser/honeybadger.js`.
3. The minified browser build, which transpiles `src/browser.ts` and its dependencies into `dist/browser/honeybadger.min.js` (+ source maps).

In addition, the TypeScript type declaration for each build is generated into its `types/` directory (ie `dist/browser/types/browser.d.ts` and `dist/server/types/server.d.ts`).

However, since the package is isomorphic, TypeScript users will likely be writing `import Honeybadger from '@honeybadger-io/js'` or `import Honeybadger = require('@honeybadger-io/js')` in their IDE. Our `package.json` has ` main` and `browser` fields that determine which build they get, but [there can only be a single type declaration file](https://github.com/Microsoft/TypeScript/issues/29128). So we use an extra file in the project root, `honeybadger.d.ts`, that combines the types from both builds.

### Tests
1. To run unit tests for both browser and server builds: `npm test`. Or separately: `npm run test:browser`, `npm run test:server`.
2. To run integration tests across all supported platforms, see [End-to-end tests with Playwright and Browserstack](#end-to-end-tests-with-playwright-and-browserstack-optional).
3. To test the TypeScript type definitions: `npm run tsd`.

#### End-to-end tests with Playwright and Browserstack (optional)
We use [Playwright](https://playwright.dev) to run integration tests in a real browser.
The config file is at `test/e2e/playwright.config.ts`.
To run these tests locally, you'll need to install the browsers you want to test with.
Open `test/e2e/browsers.ts` and enable the browsers you want to test with.
Then, run `npx playwright install --with-deps` to install the browsers.
Lastly, run `npm run test:integration`. 
Additionally, if you want to run the tests on Browserstack:
- enable Browserstack browsers in `browsers.ts`,
- set up a [BrowserStack](https://www.browserstack.com/) account and 
- use `BROWSERSTACK_USERNAME=your_username BROWSERSTACK_ACCESS_KEY=your-access-key npm run test:integration`.

##### Architecture
Inside `./test/e2e`, you will find a `server.js` file that runs a simple nodejs http server.
This server is used to serve the test page, along with other static assets and to receive the error reports from the browser.
The server is automatically started and stopped by Playwright, as you can see at the bottom of the `./test/e2e/playwright.config.ts` file.
The test page is found in `./test/e2e/sandbox.html`.
All tests are found in `./test/e2e/integration.spec.ts`.
Two more configuration files, `./test/e2e/global-setup.ts` and `./test/e2e/global-teardown.ts` are used to start and stop
a local browserstack executable, needed to run the tests on Browserstack. This executable will only be executed if you are testing on Browserstack.
Finally, the `./test/e2e/browserstack.config.ts` file contains the configuration and helper functions to run the tests on Browserstack.

##### Troubleshooting
Playwright recommends that integration tests should run on the latest browser versions.
But we also use BrowserStack to run these tests on older browsers.
This setup is a bit fragile and error logs are not always helpful

If CI starts failing without clear reason, try the following:  
Sometimes BrowserStack will resolve to a newer playwright version than the one we use in our tests.
If this happens (compare input capabilities `client.playwrightVersion` and `browserstack.playwrightVersion` on a BrowserStack test session)
first try to update `@playwright/test` and `browserstack-local` to their latest versions. 
This is necessary because BrowserStack might select a newer playwright version to run the 
tests on and unfortunately we don't have full control over this.

## Releasing

This package comes with a `postpublish` script (`scripts/release-cdn.sh`) 
which is executed every time a new version is released to NPM.
The script publishes to our *js.honeybadger.io* CDN (hosted on AWS via S3/CloudFront).

For the CDN release, make sure you have the following environment variable
available in your shell:

```
export HONEYBADGER_JS_S3_BUCKET=honeybadger-js
export HONEYBADGER_DISTRIBUTION_ID=cloudfront-id
```

AWS credentials are read from *~/.aws/credentials*, using the default profile.

If the CDN release fails for some reason (bad AWS credentials, for instance),
re-run the release manually with by executing the script `npm run postpublish`.


---
<p><a href="https://www.browserstack.com/"><img src="./browserstack-logo.png" width="150"></a><br>
 <small>We use <a href="https://www.browserstack.com/">BrowserStack</a> to run our automated integration tests on multiple platforms in CI.</small></p>

## License

This package is MIT licensed. See the [MIT-LICENSE](./MIT-LICENSE) file in this folder for details.

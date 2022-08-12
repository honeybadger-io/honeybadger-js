# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [4.0.5](https://github.com/honeybadger-io/honeybadger-js/compare/v4.0.4...v4.0.5) (2022-07-26)


### Bug Fixes

* refactor http.request for libraries that may patch it ([8007395](https://github.com/honeybadger-io/honeybadger-js/commit/8007395f8d048a49cab11a5e58e5dfa6c732f847)), closes [#843](https://github.com/honeybadger-io/honeybadger-js/issues/843)



## [4.0.4](https://github.com/honeybadger-io/honeybadger-js/compare/v4.0.3...v4.0.4) (2022-07-19)


### Bug Fixes

* check for null ([#834](https://github.com/honeybadger-io/honeybadger-js/issues/834)) ([fb50601](https://github.com/honeybadger-io/honeybadger-js/commit/fb50601f8f6b603633392866ebcd0669107806c7)), closes [#829](https://github.com/honeybadger-io/honeybadger-js/issues/829)
* install correct rollup deps, replace uglify with terser ([#812](https://github.com/honeybadger-io/honeybadger-js/issues/812)) ([674f3e7](https://github.com/honeybadger-io/honeybadger-js/commit/674f3e758216c9167af1625153e768ec2367d85a))



## [4.0.3](https://github.com/honeybadger-io/honeybadger-js/compare/v4.0.2...v4.0.3) (2022-05-17)


### Bug Fixes

* make sure file is bundled with rollup ([#793](https://github.com/honeybadger-io/honeybadger-js/issues/793)) ([fbcfea6](https://github.com/honeybadger-io/honeybadger-js/commit/fbcfea6b63c348269e8ef70c2611747d29f8b6e8))



## [4.0.2](https://github.com/honeybadger-io/honeybadger-js/compare/v4.0.1...v4.0.2) (2022-05-16)


### Bug Fixes

* cleanup CHANGELOG.md file to use with conventional-changelog ([#786](https://github.com/honeybadger-io/honeybadger-js/issues/786)) ([05b8b76](https://github.com/honeybadger-io/honeybadger-js/commit/05b8b7602dced5dfef7c6c177c8494f983aa7586)), closes [#778](https://github.com/honeybadger-io/honeybadger-js/issues/778)
* improve typings ([#788](https://github.com/honeybadger-io/honeybadger-js/issues/788)) ([2552a5f](https://github.com/honeybadger-io/honeybadger-js/commit/2552a5f7604116d4647bfcffe48e054263433705))
* make sure shipjs workflows do not modify package-lock.json ([#787](https://github.com/honeybadger-io/honeybadger-js/issues/787)) ([b1568ff](https://github.com/honeybadger-io/honeybadger-js/commit/b1568ff775a975015fef87226a0b467df922f8ef))



## [4.0.1] - 2022-05-06
### Fixed
- Typescript typings for optional dependencies

## [4.0.0] - 2022-05-04
### Added
- AWS Lambda Timeout Warning (#679)
- Enforce Conventional Commits using a git hook (#731)
- Nodejs: Include source snippet in backtraces when available (#624)
- `notifyAsync`: Async version of `notify` that returns a promise (#327)
- AsyncLocalStorage for AWS Lambda Handler (#688)
- Node.js: Added the `hb.withRequest(req, fn)` method for webserver apps, which runs a `fn`, isolating its context to the request `req` and tracking it across async chains. The `Honeybadger.requestMiddleware` for Express is now a wrapper around this. (#711, #717)
- `Honeybadger.checkIn()` (#725)

### Fixed
- Respect object.toJSON() in breadcrumb.metadata  (#722)
- Allow special characters in tags. Also support space-delimited tags:
  "one two three" and "one, two, three" are equivalent
- Include reported error link in logs (#713)
- Properly handle objects which are not native Errors but have the Error prototype (#712)

### Changed
- Call afterNotify handlers with error if notify preconditions fail (#654)
- Call beforeNotify handlers even if preconditions fail (#654)
- `Honeybadger.lambdaHandler`: return async or callback based handler based on input handler (#677)
- Remove deprecated `disabled` config option (#671)
- Apply `enableUncaught` setting to timers and event listeners (#690)
- Name wrapped Lambda handlers for better stack traces (#700)

## [3.2.8] - 2022-02-15
### Fixed
- Catch unknown errors in data sanitizer

## [3.2.7] - 2021-11-01
### Fixed
- Call lambda handler callback with result if user-defined handler is async (#648)

## [3.2.6] - 2021-10-26
### Fixed
- Call lambda handler callback if notify preconditions fail (#648)

## [3.2.5] - 2021-09-22
### Fixed
- Check for api key only if enabled (#637)

## [3.2.4] - 2021-08-31
### Fixed
- Add details option to notice (#629)

## [3.2.3] - 2021-08-11
### Fixed
- TypeScript: Make exported type definition work as type or value (#621)

## [3.2.2] - 2021-07-19
### Fixed
- TypeScript: Add missing methods typedefs (#611)
- Internal: Fixed TypeScript types, added null checks, automated type declaration files

## [3.2.1] - 2021-05-17
### Fixed
- TypeScript: Use express types for middleware (#564)

## [3.2.0] - 2021-03-30
### Fixed
- Update Node API endpoint to enable source map processing for server-side errors.

### Added
- Add tagging to errors with 3 possible API's
    ```bash
    Honeybadger.configure({tags: string | string[] | undefined})
    Honeybadger.setContext({tags: string | string[] | undefined})
    Honeybadger.notify('error', {tags: string | string[] | undefined})
    ```

## [3.1.0] - 2021-03-04
### Fixed
- Add default reason for unhandled promises (previously reason was "undefined") (#546)

### Added
- Add `Honeybadger.clear()` method to clear context and breadcrumbs
- Deprecate `Honeybadger.resetContext()`

## [3.0.4] - 2021-03-01
### Fixed
- Add server middleware signatures to type declarations (#540, @getabetterpic)

## [3.0.3] - 2021-02-02
### Fixed
- types: Make sure every breadcrumb prop is optional (#527, @paambaati)

## [3.0.2] - 2021-01-28
### Fixed
- utf8 encode JSON payload in Node

## [3.0.1] - 2021-01-20
### Fixed
- Adjust backtrace display and logging in Node
- Fix a bug in Node lambdaHandler

## [3.0.0] - 2021-01-19
### Added
- [@honeybadger-io/js](https://www.npmjs.com/package/@honeybadger-io/js) is
  a new universal/isomorphic JavaScript package combining the deprecated
  [honeybadger-js for browsers](https://www.npmjs.com/package/honeybadger-js)
  and the [honeybadger for Node.js](https://www.npmjs.com/package/honeybadger)
  NPM packages.

  Moving forward, development for both platforms will happen here. The new API
  is mostly the same as the old packages, with a few breaking config changes.
  Users who are upgrading from either the *honeybadger-js* or *honeybadger* NPM
  packages should read [the upgrading
  guide](https://docs.honeybadger.io/lib/javascript/support/upgrading-to-v3.html),
  and all users should refer to the [new
  documentation](https://docs.honeybadger.io/lib/javascript/index.html).

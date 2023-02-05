# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [4.10.0](https://github.com/honeybadger-io/honeybadger-js/compare/v4.9.3...v4.10.0) (2023-02-05)


### Features

* **rollup-plugin:** add rollup/vite plugin that uploads sourcemaps to honeybadger API ([850b2b5](https://github.com/honeybadger-io/honeybadger-js/commit/850b2b5740d960e7e533b848c09c62a9bb9f63cb))





## [4.9.3](https://github.com/honeybadger-io/honeybadger-js/compare/v4.9.2...v4.9.3) (2023-01-20)


### Bug Fixes

* **vue3:** constructor was accessed during render warning in ([40568c9](https://github.com/honeybadger-io/honeybadger-js/commit/40568c949f6dda402db472e41d41e5d0d3e1ac1f)), closes [#996](https://github.com/honeybadger-io/honeybadger-js/issues/996)





## [4.9.2](https://github.com/honeybadger-io/honeybadger-js/compare/v4.9.1...v4.9.2) (2023-01-18)


### Bug Fixes

* replace instrument with safer alternative addEventListener ([#1002](https://github.com/honeybadger-io/honeybadger-js/issues/1002)) ([8569f09](https://github.com/honeybadger-io/honeybadger-js/commit/8569f096788b55beb26a6290f4b481035455adbb))





## [4.9.1](https://github.com/honeybadger-io/honeybadger-js/compare/v4.9.0...v4.9.1) (2023-01-14)


### Bug Fixes

* improve generateStackTrace function to hide vue warn message ([#1000](https://github.com/honeybadger-io/honeybadger-js/issues/1000)) ([45c6ad6](https://github.com/honeybadger-io/honeybadger-js/commit/45c6ad6bc30a3680ddb402bd3598fda4d57f8ec9))





# [4.9.0](https://github.com/honeybadger-io/honeybadger-js/compare/v4.8.2...v4.9.0) (2023-01-14)


### Features

* collect user feedback ([#965](https://github.com/honeybadger-io/honeybadger-js/issues/965)) ([0842f0a](https://github.com/honeybadger-io/honeybadger-js/commit/0842f0afeb65dc28045809cae4ebc94e461aeb4b))





## [4.8.2](https://github.com/honeybadger-io/honeybadger-js/compare/v4.8.1...v4.8.2) (2023-01-02)

**Note:** Version bump only for package root





## [4.8.1](https://github.com/honeybadger-io/honeybadger-js/compare/v4.8.0...v4.8.1) (2022-12-22)


### Bug Fixes

* filter out honeybadger source code from stack trace ([#982](https://github.com/honeybadger-io/honeybadger-js/issues/982)) ([e647b75](https://github.com/honeybadger-io/honeybadger-js/commit/e647b75a58bce6a98da6bcc418dd77ecabe0fae1))





# [4.8.0](https://github.com/honeybadger-io/honeybadger-js/compare/v4.7.5...v4.8.0) (2022-12-12)


### Features

* add window / document checks, refactor XMLHttpRequest to Fetch ([#958](https://github.com/honeybadger-io/honeybadger-js/issues/958)) ([b7e717f](https://github.com/honeybadger-io/honeybadger-js/commit/b7e717fc685f637717f304522b3e093521dc5657))





## [4.7.5](https://github.com/honeybadger-io/honeybadger-js/compare/v4.7.4...v4.7.5) (2022-12-05)

**Note:** Version bump only for package root





## [4.7.4](https://github.com/honeybadger-io/honeybadger-js/compare/v4.7.3...v4.7.4) (2022-11-26)


### Bug Fixes

* exit process on unhandledRejection ([#950](https://github.com/honeybadger-io/honeybadger-js/issues/950)) ([ffff051](https://github.com/honeybadger-io/honeybadger-js/commit/ffff05101abf8251ff4cf1289a11a5fdedca060b))





## [4.7.3](https://github.com/honeybadger-io/honeybadger-js/compare/v4.7.2...v4.7.3) (2022-11-22)


### Bug Fixes

* webpack compilaton issues ([#952](https://github.com/honeybadger-io/honeybadger-js/issues/952)) ([2d9bd24](https://github.com/honeybadger-io/honeybadger-js/commit/2d9bd248bd653a417736cff2710b50b5e3319363))





## [4.7.2](https://github.com/honeybadger-io/honeybadger-js/compare/v4.7.1...v4.7.2) (2022-11-21)

**Note:** Version bump only for package root





## [4.7.1](https://github.com/honeybadger-io/honeybadger-js/compare/v4.7.0...v4.7.1) (2022-11-14)

**Note:** Version bump only for package root





# [4.7.0](https://github.com/honeybadger-io/honeybadger-js/compare/v4.6.2...v4.7.0) (2022-11-01)


### Bug Fixes

* require correct honeybadger js package ([#919](https://github.com/honeybadger-io/honeybadger-js/issues/919)) ([9ab2288](https://github.com/honeybadger-io/honeybadger-js/commit/9ab2288b01780194525448201044f932044d03ad))


### Features

* migrate honeybadger-react-native to monorepo ([#901](https://github.com/honeybadger-io/honeybadger-js/issues/901)) ([46f3d7e](https://github.com/honeybadger-io/honeybadger-js/commit/46f3d7e0db7c4c18698fb2044802351efbbdbab9))





## [4.6.2](https://github.com/honeybadger-io/honeybadger-js/compare/v4.6.1...v4.6.2) (2022-10-28)


### Bug Fixes

* add @types/express in deps ([#917](https://github.com/honeybadger-io/honeybadger-js/issues/917)) ([d06717b](https://github.com/honeybadger-io/honeybadger-js/commit/d06717b1ada4d96a1eefd3eff7c1084371e5986d))





## [4.6.1](https://github.com/honeybadger-io/honeybadger-js/compare/v4.6.0...v4.6.1) (2022-10-24)


### Bug Fixes

* README.md misleading dev to use wrong import code on while working with ES6 Import.  ([#916](https://github.com/honeybadger-io/honeybadger-js/issues/916)) ([246633a](https://github.com/honeybadger-io/honeybadger-js/commit/246633a4db1c422868b530ad925ff99ed0b90503))





# [4.6.0](https://github.com/honeybadger-io/honeybadger-js/compare/v4.5.0...v4.6.0) (2022-10-17)


### Features

* rework store API ([d814174](https://github.com/honeybadger-io/honeybadger-js/commit/d81417456f2f0b3b69f22cf96c24c5fd330fd5d8))





# [4.5.0](https://github.com/honeybadger-io/honeybadger-js/compare/v4.4.1...v4.5.0) (2022-10-04)


### Features

* migrate gatsby-plugin to monorepo ([#903](https://github.com/honeybadger-io/honeybadger-js/issues/903)) ([84bc0f9](https://github.com/honeybadger-io/honeybadger-js/commit/84bc0f9d57bd3b6a56f51508072b91afd36cede9))





## [4.4.1](https://github.com/honeybadger-io/honeybadger-js/compare/v4.4.0...v4.4.1) (2022-10-03)

**Note:** Version bump only for package root





# [4.4.0](https://github.com/honeybadger-io/honeybadger-js/compare/v4.3.1...v4.4.0) (2022-09-28)


### Features

* migrate honeybadger-react to monorepo ([#892](https://github.com/honeybadger-io/honeybadger-js/issues/892)) ([e026b76](https://github.com/honeybadger-io/honeybadger-js/commit/e026b76fe6e2540fcd1be33274a5e5cb61cd4a90))





## [4.3.1](https://github.com/honeybadger-io/honeybadger-js/compare/v4.3.0...v4.3.1) (2022-09-26)


### Bug Fixes

* clean asset url with regex ([#886](https://github.com/honeybadger-io/honeybadger-js/issues/886)) ([9c0032b](https://github.com/honeybadger-io/honeybadger-js/commit/9c0032bcfbe739dc68804f7dfe7ebf557aa45060)), closes [#878](https://github.com/honeybadger-io/honeybadger-js/issues/878)





# [4.3.0](https://github.com/honeybadger-io/honeybadger-js/compare/v4.2.1...v4.3.0) (2022-09-17)


### Bug Fixes

* handle sync lambda handlers (non callback-based) ([#887](https://github.com/honeybadger-io/honeybadger-js/issues/887)) ([be5c2fd](https://github.com/honeybadger-io/honeybadger-js/commit/be5c2fd8ca5ef61971bc522f036e2f6ab9555477)), closes [#860](https://github.com/honeybadger-io/honeybadger-js/issues/860)


### Features

* migrate honeybadger-vue to monorepo ([#881](https://github.com/honeybadger-io/honeybadger-js/issues/881)) ([3172203](https://github.com/honeybadger-io/honeybadger-js/commit/317220310f07edd18283214fe8901cab31218416)), closes [#870](https://github.com/honeybadger-io/honeybadger-js/issues/870) [#870](https://github.com/honeybadger-io/honeybadger-js/issues/870) [#870](https://github.com/honeybadger-io/honeybadger-js/issues/870) [#870](https://github.com/honeybadger-io/honeybadger-js/issues/870) [#870](https://github.com/honeybadger-io/honeybadger-js/issues/870) [#870](https://github.com/honeybadger-io/honeybadger-js/issues/870) [#870](https://github.com/honeybadger-io/honeybadger-js/issues/870) [#870](https://github.com/honeybadger-io/honeybadger-js/issues/870) [#870](https://github.com/honeybadger-io/honeybadger-js/issues/870) [#870](https://github.com/honeybadger-io/honeybadger-js/issues/870)





## [4.2.1](https://github.com/honeybadger-io/honeybadger-js/compare/v4.2.0...v4.2.1) (2022-09-16)


### Bug Fixes

* release correct version, lerna import did not work ([#883](https://github.com/honeybadger-io/honeybadger-js/issues/883)) ([cbe73ac](https://github.com/honeybadger-io/honeybadger-js/commit/cbe73ac7c715c626c07f56f667b2c9c447c9dcb4))





# [4.2.0](https://github.com/honeybadger-io/honeybadger-js/compare/v4.1.3...v4.2.0) (2022-09-13)


### Features

* migrate honeybadger-webpack to monorepo ([#869](https://github.com/honeybadger-io/honeybadger-js/issues/869)) ([0c31c1a](https://github.com/honeybadger-io/honeybadger-js/commit/0c31c1ad2905f275574263f3b34cb9c33cab6e10))
* workflow for automatic (scheduled) releases ([#867](https://github.com/honeybadger-io/honeybadger-js/issues/867)) ([1f01d94](https://github.com/honeybadger-io/honeybadger-js/commit/1f01d9480398f9569cc596ac528c37fc9e79ba4c)), closes [#861](https://github.com/honeybadger-io/honeybadger-js/issues/861)





## [4.1.3](https://github.com/honeybadger-io/honeybadger-js/compare/v4.1.2...v4.1.3) (2022-09-04)


### Bug Fixes

* revert to es5 transpilation ([#866](https://github.com/honeybadger-io/honeybadger-js/issues/866)) ([97bd2e7](https://github.com/honeybadger-io/honeybadger-js/commit/97bd2e7d3c066819c52d9c6d7c6cd01d0e08bc6b)), closes [#863](https://github.com/honeybadger-io/honeybadger-js/issues/863)
* update package-lock.json to include @types/aws-lambda ([85748bb](https://github.com/honeybadger-io/honeybadger-js/commit/85748bbab1141ac1bf1d99d1eeeee761d2e58af2))





## [4.1.2](https://github.com/honeybadger-io/honeybadger-js/compare/v4.1.1...v4.1.2) (2022-09-01)


### Bug Fixes

* add @types/aws-lambda as a dependency ([#865](https://github.com/honeybadger-io/honeybadger-js/issues/865)) ([56a7dc3](https://github.com/honeybadger-io/honeybadger-js/commit/56a7dc353b8cf61ef9f34403de3a921c42a0b01d)), closes [#863](https://github.com/honeybadger-io/honeybadger-js/issues/863)





## [4.1.1](https://github.com/honeybadger-io/honeybadger-js/compare/v4.1.0...v4.1.1) (2022-08-20)


### Bug Fixes

* improve type definition for GlobalStore ([#862](https://github.com/honeybadger-io/honeybadger-js/issues/862)) ([6f722fe](https://github.com/honeybadger-io/honeybadger-js/commit/6f722fece40dd08a903affdff7f5f2dd643c1612))





# [4.1.0](https://github.com/honeybadger-io/honeybadger-js/compare/v4.0.5...v4.1.0) (2022-08-12)


### Bug Fixes

* lint nags ([1d92728](https://github.com/honeybadger-io/honeybadger-js/commit/1d927285c005b5f6cf0f6b50b553dee2133bd101))
* support older Node.js versions ([7ea04a5](https://github.com/honeybadger-io/honeybadger-js/commit/7ea04a5161462605e30f416462d6d841d63d1696))


### Features

* **monorepo:** setup monorepo skeleton and break js to 2 packages ([#844](https://github.com/honeybadger-io/honeybadger-js/issues/844)) ([2fbdc56](https://github.com/honeybadger-io/honeybadger-js/commit/2fbdc56678da3ccebca3dbb99795e803888540fd)), closes [#854](https://github.com/honeybadger-io/honeybadger-js/issues/854)
* support nested exceptions (Error.prototype.cause) ([ac958ee](https://github.com/honeybadger-io/honeybadger-js/commit/ac958ee4fe8dd479fa9a9412c9c3a98823555fc3))
* unwind nested error causes ([551fcee](https://github.com/honeybadger-io/honeybadger-js/commit/551fcee52ff00b50fed6df964a883aeb915490d8))





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

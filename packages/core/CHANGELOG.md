# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [6.2.0](https://github.com/honeybadger-io/honeybadger-js/compare/@honeybadger-io/core@6.1.0...@honeybadger-io/core@6.2.0) (2023-08-07)


### Features

* allow async beforeNotify functions to modify the notice object ([#984](https://github.com/honeybadger-io/honeybadger-js/issues/984)) ([bcb2b92](https://github.com/honeybadger-io/honeybadger-js/commit/bcb2b92ca479aae26b648fb7bb5480b8c2eadd8b))



## [6.1.0](https://github.com/honeybadger-io/honeybadger-js/compare/@honeybadger-io/core@6.0.0...@honeybadger-io/core@6.1.0) (2023-07-17)


### Features

* specify notifier per package ([#1107](https://github.com/honeybadger-io/honeybadger-js/issues/1107)) ([fe14f50](https://github.com/honeybadger-io/honeybadger-js/commit/fe14f509c60f36bf3456b8a4fbd743648c2b5ea1))



## 6.0.0 (2023-06-02)

## 5.2.0 (2023-03-27)


### Features

* **core:** accept a backtrace passed in the notice ([#1049](https://github.com/honeybadger-io/honeybadger-js/issues/1049)) ([9c56a9f](https://github.com/honeybadger-io/honeybadger-js/commit/9c56a9f41deec7d8a655c770b4a8ca03ca56b177))

## 5.0.0 (2023-02-05)


### ⚠ BREAKING CHANGES

* minimum supported nodejs at v14.x
* update to lerna 6 (#918)

### Build System

* minimum supported nodejs at v14.x ([e1f3e01](https://github.com/honeybadger-io/honeybadger-js/commit/e1f3e018ad7d956da1180656ce757e82097846bd))
* update to lerna 6 ([#918](https://github.com/honeybadger-io/honeybadger-js/issues/918)) ([b12d1e8](https://github.com/honeybadger-io/honeybadger-js/commit/b12d1e88937c2c8de2628653ca48535766079ec4))

## 4.10.0 (2023-02-05)


### ⚠ BREAKING CHANGES

* specify "engines" in package.json

### Features

* specify "engines" in package.json ([d0eb1a3](https://github.com/honeybadger-io/honeybadger-js/commit/d0eb1a368b9904d464528a61844fa52416d14828)), closes [#961](https://github.com/honeybadger-io/honeybadger-js/issues/961)

## 4.9.2 (2023-01-18)


### Bug Fixes

* replace instrument with safer alternative addEventListener ([#1002](https://github.com/honeybadger-io/honeybadger-js/issues/1002)) ([8569f09](https://github.com/honeybadger-io/honeybadger-js/commit/8569f096788b55beb26a6290f4b481035455adbb))

## 4.9.0 (2023-01-14)


### Features

* collect user feedback ([#965](https://github.com/honeybadger-io/honeybadger-js/issues/965)) ([0842f0a](https://github.com/honeybadger-io/honeybadger-js/commit/0842f0afeb65dc28045809cae4ebc94e461aeb4b))

## 4.8.2 (2023-01-02)

## 4.8.1 (2022-12-22)


### Bug Fixes

* filter out honeybadger source code from stack trace ([#982](https://github.com/honeybadger-io/honeybadger-js/issues/982)) ([e647b75](https://github.com/honeybadger-io/honeybadger-js/commit/e647b75a58bce6a98da6bcc418dd77ecabe0fae1))

## 4.8.0 (2022-12-12)


### Features

* add window / document checks, refactor XMLHttpRequest to Fetch ([#958](https://github.com/honeybadger-io/honeybadger-js/issues/958)) ([b7e717f](https://github.com/honeybadger-io/honeybadger-js/commit/b7e717fc685f637717f304522b3e093521dc5657))

## 4.6.0 (2022-10-17)


### Features

* rework store API ([d814174](https://github.com/honeybadger-io/honeybadger-js/commit/d81417456f2f0b3b69f22cf96c24c5fd330fd5d8))

## 4.3.0 (2022-09-17)


### Features

* migrate honeybadger-vue to monorepo ([#881](https://github.com/honeybadger-io/honeybadger-js/issues/881)) ([3172203](https://github.com/honeybadger-io/honeybadger-js/commit/317220310f07edd18283214fe8901cab31218416)), closes [#870](https://github.com/honeybadger-io/honeybadger-js/issues/870) [#870](https://github.com/honeybadger-io/honeybadger-js/issues/870) [#870](https://github.com/honeybadger-io/honeybadger-js/issues/870) [#870](https://github.com/honeybadger-io/honeybadger-js/issues/870) [#870](https://github.com/honeybadger-io/honeybadger-js/issues/870) [#870](https://github.com/honeybadger-io/honeybadger-js/issues/870) [#870](https://github.com/honeybadger-io/honeybadger-js/issues/870) [#870](https://github.com/honeybadger-io/honeybadger-js/issues/870) [#870](https://github.com/honeybadger-io/honeybadger-js/issues/870) [#870](https://github.com/honeybadger-io/honeybadger-js/issues/870)

## 4.2.0 (2022-09-13)


### Features

* migrate honeybadger-webpack to monorepo ([#869](https://github.com/honeybadger-io/honeybadger-js/issues/869)) ([0c31c1a](https://github.com/honeybadger-io/honeybadger-js/commit/0c31c1ad2905f275574263f3b34cb9c33cab6e10))

## 4.1.1 (2022-08-20)


### Bug Fixes

* improve type definition for GlobalStore ([#862](https://github.com/honeybadger-io/honeybadger-js/issues/862)) ([6f722fe](https://github.com/honeybadger-io/honeybadger-js/commit/6f722fece40dd08a903affdff7f5f2dd643c1612))

## 4.1.0 (2022-08-12)


### Features

* **monorepo:** setup monorepo skeleton and break js to 2 packages ([#844](https://github.com/honeybadger-io/honeybadger-js/issues/844)) ([2fbdc56](https://github.com/honeybadger-io/honeybadger-js/commit/2fbdc56678da3ccebca3dbb99795e803888540fd)), closes [#854](https://github.com/honeybadger-io/honeybadger-js/issues/854)



## [5.2.0](https://github.com/honeybadger-io/honeybadger-js/compare/v5.1.7...v5.2.0) (2023-03-27)


### Features

* **core:** accept a backtrace passed in the notice ([#1049](https://github.com/honeybadger-io/honeybadger-js/issues/1049)) ([9c56a9f](https://github.com/honeybadger-io/honeybadger-js/commit/9c56a9f41deec7d8a655c770b4a8ca03ca56b177))



## [5.0.0](https://github.com/honeybadger-io/honeybadger-js/compare/v4.10.0...v5.0.0) (2023-02-05)


### ⚠ BREAKING CHANGES

* minimum supported nodejs at v14.x
* update to lerna 6 (#918)

### Build System

* minimum supported nodejs at v14.x ([e1f3e01](https://github.com/honeybadger-io/honeybadger-js/commit/e1f3e018ad7d956da1180656ce757e82097846bd))
* update to lerna 6 ([#918](https://github.com/honeybadger-io/honeybadger-js/issues/918)) ([b12d1e8](https://github.com/honeybadger-io/honeybadger-js/commit/b12d1e88937c2c8de2628653ca48535766079ec4))



## [4.9.2](https://github.com/honeybadger-io/honeybadger-js/compare/v4.9.1...v4.9.2) (2023-01-18)


### Bug Fixes

* replace instrument with safer alternative addEventListener ([#1002](https://github.com/honeybadger-io/honeybadger-js/issues/1002)) ([8569f09](https://github.com/honeybadger-io/honeybadger-js/commit/8569f096788b55beb26a6290f4b481035455adbb))





# [4.9.0](https://github.com/honeybadger-io/honeybadger-js/compare/v4.8.2...v4.9.0) (2023-01-14)


### Features

* collect user feedback ([#965](https://github.com/honeybadger-io/honeybadger-js/issues/965)) ([0842f0a](https://github.com/honeybadger-io/honeybadger-js/commit/0842f0afeb65dc28045809cae4ebc94e461aeb4b))





## [4.8.2](https://github.com/honeybadger-io/honeybadger-js/compare/v4.8.1...v4.8.2) (2023-01-02)

**Note:** Version bump only for package @honeybadger-io/core





## [4.8.1](https://github.com/honeybadger-io/honeybadger-js/compare/v4.8.0...v4.8.1) (2022-12-22)


### Bug Fixes

* filter out honeybadger source code from stack trace ([#982](https://github.com/honeybadger-io/honeybadger-js/issues/982)) ([e647b75](https://github.com/honeybadger-io/honeybadger-js/commit/e647b75a58bce6a98da6bcc418dd77ecabe0fae1))





# [4.8.0](https://github.com/honeybadger-io/honeybadger-js/compare/v4.7.5...v4.8.0) (2022-12-12)


### Features

* add window / document checks, refactor XMLHttpRequest to Fetch ([#958](https://github.com/honeybadger-io/honeybadger-js/issues/958)) ([b7e717f](https://github.com/honeybadger-io/honeybadger-js/commit/b7e717fc685f637717f304522b3e093521dc5657))





# [4.6.0](https://github.com/honeybadger-io/honeybadger-js/compare/v4.5.0...v4.6.0) (2022-10-17)


### Features

* rework store API ([d814174](https://github.com/honeybadger-io/honeybadger-js/commit/d81417456f2f0b3b69f22cf96c24c5fd330fd5d8))





# [4.3.0](https://github.com/honeybadger-io/honeybadger-js/compare/v4.2.1...v4.3.0) (2022-09-17)


### Features

* migrate honeybadger-vue to monorepo ([#881](https://github.com/honeybadger-io/honeybadger-js/issues/881)) ([3172203](https://github.com/honeybadger-io/honeybadger-js/commit/317220310f07edd18283214fe8901cab31218416)), closes [#870](https://github.com/honeybadger-io/honeybadger-js/issues/870) [#870](https://github.com/honeybadger-io/honeybadger-js/issues/870) [#870](https://github.com/honeybadger-io/honeybadger-js/issues/870) [#870](https://github.com/honeybadger-io/honeybadger-js/issues/870) [#870](https://github.com/honeybadger-io/honeybadger-js/issues/870) [#870](https://github.com/honeybadger-io/honeybadger-js/issues/870) [#870](https://github.com/honeybadger-io/honeybadger-js/issues/870) [#870](https://github.com/honeybadger-io/honeybadger-js/issues/870) [#870](https://github.com/honeybadger-io/honeybadger-js/issues/870) [#870](https://github.com/honeybadger-io/honeybadger-js/issues/870)





# [4.2.0](https://github.com/honeybadger-io/honeybadger-js/compare/v4.1.3...v4.2.0) (2022-09-13)


### Features

* migrate honeybadger-webpack to monorepo ([#869](https://github.com/honeybadger-io/honeybadger-js/issues/869)) ([0c31c1a](https://github.com/honeybadger-io/honeybadger-js/commit/0c31c1ad2905f275574263f3b34cb9c33cab6e10))





## [4.1.1](https://github.com/honeybadger-io/honeybadger-js/compare/v4.1.0...v4.1.1) (2022-08-20)


### Bug Fixes

* improve type definition for GlobalStore ([#862](https://github.com/honeybadger-io/honeybadger-js/issues/862)) ([6f722fe](https://github.com/honeybadger-io/honeybadger-js/commit/6f722fece40dd08a903affdff7f5f2dd643c1612))





# [4.1.0](https://github.com/honeybadger-io/honeybadger-js/compare/v4.0.5...v4.1.0) (2022-08-12)


### Features

* **monorepo:** setup monorepo skeleton and break js to 2 packages ([#844](https://github.com/honeybadger-io/honeybadger-js/issues/844)) ([2fbdc56](https://github.com/honeybadger-io/honeybadger-js/commit/2fbdc56678da3ccebca3dbb99795e803888540fd)), closes [#854](https://github.com/honeybadger-io/honeybadger-js/issues/854)

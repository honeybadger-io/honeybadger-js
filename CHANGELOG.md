# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased][latest]
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

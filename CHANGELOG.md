# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased][latest]
### Added
- Nodejs: Include source snippet in backtraces when available (#624)
- Added Chrome Extension example project

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

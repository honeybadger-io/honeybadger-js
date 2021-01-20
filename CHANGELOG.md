# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased][latest]
### Fixed
- Adjust backtrace display and logging in Node

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

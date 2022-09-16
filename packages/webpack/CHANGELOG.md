# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [4.2.1](https://github.com/honeybadger-io/honeybadger-webpack/compare/v4.2.0...v4.2.1) (2022-09-16)


### Bug Fixes

* release correct version, lerna import did not work ([#883](https://github.com/honeybadger-io/honeybadger-webpack/issues/883)) ([cbe73ac](https://github.com/honeybadger-io/honeybadger-webpack/commit/cbe73ac7c715c626c07f56f667b2c9c447c9dcb4))





# Change log
All notable changes to this project will be documented in this file.

# [4.2.0](https://github.com/honeybadger-io/honeybadger-webpack/compare/v4.1.3...v4.2.0) (2022-09-13)


### Features

* migrate honeybadger-webpack to monorepo ([#869](https://github.com/honeybadger-io/honeybadger-webpack/issues/869)) ([0c31c1a](https://github.com/honeybadger-io/honeybadger-webpack/commit/0c31c1ad2905f275574263f3b34cb9c33cab6e10))



## [1.5.1] - 2021-11-19
### Fixed
- Don't upload source maps if app is running with webpack-dev-server (#325)

## [1.5.0] - 2021-06-21
### Added
- Support for sending deployment notifications

## [1.4.0] - 2021-04-20
### Added
- Add worker support when uploading sourcemaps. Defaults to 5 files
  being uploaded in parallel.

## [1.3.0] - 2021-04-13
### Added
- Add retry functionality for fetch requests via
  [fetch-retry](https://github.com/vercel/fetch-retry)
- Add a retry option that defaults to 3, with a max number of retries
  of 10.
- Add a warning if no assets will be uploaded. Uses console.info instead
  of process.stdout.write.
- Add a configurable `endpoint` to the constructor, defaults to
  `https://api.honeybadger.io/v1/source_maps`
- Add a check for auxiliary files for Webpack 5 compatibility
- Add Webpack 5 compatibility
- Make Webpack 4+ a peerDependency

### Fixed
- fetch separates response errors from network errors.
  400+ status codes are treated separately from actual network errors.
- Attempt to reduce `ECONNRESET` and `SOCKETTIMEOUT` errors by
  using `fetch-retry`

## [1.2.0] - 2019-12-18
### Changed
- [Requires Webpack 4.39] Use assetEmitted hook to mitigate `futureEmitAssets = true` -@qnighy (#122)

### Fixed
- Dependency & security updates

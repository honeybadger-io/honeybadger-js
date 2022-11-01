# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [4.7.0](https://github.com/honeybadger-io/honeybadger-js/compare/v4.6.2...v4.7.0) (2022-11-01)


### Features

* migrate honeybadger-react-native to monorepo ([#901](https://github.com/honeybadger-io/honeybadger-js/issues/901)) ([46f3d7e](https://github.com/honeybadger-io/honeybadger-js/commit/46f3d7e0db7c4c18698fb2044802351efbbdbab9))





# Changelog
All notable changes to this project will be documented in this file.

## [0.0.12] - 2022-09-02
### Added
- Updated the iOS module to work better with Ignite (and possibly other React Native boilerplates).

## [0.0.11] - 2022-04-12
### Added
- Updated the Android Native Module to support newer versions of the Android tech stack.

## [0.0.10] - 2022-04-05
### Added
- Add support for React 17.

## [0.0.9] - 2022-02-23
### Added
- Add support for the `reportErrors` configuration option.

## [0.0.8] - 2021-08-12
### Added
- Add support for `revision` and `projectRoot` configuration options.
- Add TypeScript definitions.

## [0.0.7] - 2021-06-17
### Fixed
- Allow the default JS error handler to process the error after we're done with it so that RN shows the useful red info box in dev.

## [0.0.6] - 2021-06-17
### Added
- Added ability to differentiate and configure console output by log level, eliminating frivolous logging.

## [0.0.5] - 2021-06-15
### Fixed
- Removed regex named capture groups in favor of numeric capture groups in order to be able to support the Hermes JS engine.

## [0.0.4] - 2021-03-24
### Added
- honeybadger-generate-sourcemaps now generates main.jsbundle files for both iOS and Android.

## [0.0.3] - 2021-02-24
### Changed
- Changed the package of the native module for Android to io.honeybadger

## [0.0.2] - 2021-02-23
### Changed
- Rename the stackAddress key to stack_address to be more consistent with the HB spec.

### Added
- Allow for changing of the HB API key.

## [0.0.1] - 2021-02-15
### Added
- Initial release

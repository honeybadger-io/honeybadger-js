# Honeybadger for JavaScript - core package

![Node CI](https://github.com/honeybadger-io/honeybadger-js/workflows/Node%20CI/badge.svg)
[![npm version](https://badge.fury.io/js/%40honeybadger-io%2Fcore.svg)](https://badge.fury.io/js/%40honeybadger-io%2Fcore)
[![npm dm](https://img.shields.io/npm/dm/@honeybadger-io/core)](https://www.npmjs.com/package/@honeybadger-io/core)
[![npm dt](https://img.shields.io/npm/dt/@honeybadger-io/core)](https://www.npmjs.com/package/@honeybadger-io/core)

Universal JavaScript library for integrating apps with the :zap: [Honeybadger Error Notifier](http://honeybadger.io).

## Usage

You shouldn't need to use this package directly. This package serves as the core implementation of a Honeybadger client
for our packages written in Javascript.

## Development

Everything is written in Typescript and transpiled to es6 (see `tsconfig.base.json`) with `npm run build`.
Other packages are responsible to bundle for different browsers/environments/frameworks.

Run tests with `npm test`.

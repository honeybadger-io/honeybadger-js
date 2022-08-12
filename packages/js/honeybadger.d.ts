/* eslint-disable import/no-unresolved */
// Type definitions for honeybadger.js
// Project: https://github.com/honeybadger-io/honeybadger-js
import Server from './dist/server/honeybadger'
import Browser from './dist/browser/honeybadger'

type Honeybadger = typeof Server & typeof Browser;
declare const Honeybadger: Honeybadger;
export = Honeybadger;

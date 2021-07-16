// Type definitions for honeybadger.js
// Project: https://github.com/honeybadger-io/honeybadger-js
import Server from './dist/server/types/server'
import Browser from './dist/browser/types/browser'

declare const Honeybadger: typeof Server & typeof Browser
export = Honeybadger

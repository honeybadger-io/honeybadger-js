/*
  honeybadger.js v0.3.1
  A JavaScript Notifier for Honeybadger
  https://github.com/honeybadger-io/honeybadger-js
  https://www.honeybadger.io/
  MIT license
*/
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    // Browserfy. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Browserfy/Node.
    module.exports = factory();
  } else {
    // Browser globals (root is window)
    root.Honeybadger = factory();
  }
}(this, function () {

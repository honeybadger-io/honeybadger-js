// Copy type declaration files for backwards compatibility with earlier versions of Honeybadger

/* eslint-disable */

const fs = require('fs');
fs.copyFileSync('honeybadger.d.ts', 'dist/browser/honeybadger.d.ts');
fs.copyFileSync('honeybadger.d.ts', 'dist/server/honeybadger.d.ts');

console.info("Copied declaration files");
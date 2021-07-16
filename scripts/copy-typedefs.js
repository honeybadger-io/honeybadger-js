// Copy type declaration files for backwards compatibility with earlier versions of Honeybadger

/* eslint-disable */

const fs = require('fs');
fs.writeFileSync(
    'dist/browser/honeybadger.d.ts',
    fs.readFileSync('dist/browser/types/browser.d.ts', 'utf8').replace(/'\.\//g, `'./types/`)
);
fs.writeFileSync(
    'dist/server/honeybadger.d.ts',
    fs.readFileSync('dist/server/types/server.d.ts', 'utf8').replace(/'\.\//g, `'./types/`)
);

console.info("Copied declaration files");
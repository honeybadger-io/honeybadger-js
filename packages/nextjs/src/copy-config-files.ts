#!/usr/bin/env node

const path = require('path')
const fs = require('fs')

const debug = process.env.HONEYBADGER_DEBUG === 'true'

async function copyConfigFiles() {
  if (debug) {
    console.debug('cwd', process.cwd())
  }

  const templateDir = path.resolve(__dirname, '../templates');
  const files = await fs.promises.readdir(templateDir);
  const copyPromises = files.map((file) => {
    if (debug) {
      console.debug('copying', file)
    }
    return fs.promises.copyFile(path.join(templateDir, file), file);
  });
  await Promise.all(copyPromises);

  console.log('Done copying config files.')
}

copyConfigFiles().catch((err) => {
  console.error(err)
  process.exit(1)
})

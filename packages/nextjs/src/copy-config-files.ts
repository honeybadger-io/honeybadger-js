#!/usr/bin/env node

const path = require('path')
const fs = require('fs')

const debug = process.env.HONEYBADGER_DEBUG === 'true'

async function copyErrorJs() {
  const targetPath = path.join('pages', '_error.js')
  const errorJsAlreadyExists = fs.existsSync(targetPath)
  if (errorJsAlreadyExists) {
    // Don't overwrite an existing _error.js file.
    // Create a _error.js.bak file instead.
    const backupPath = path.join('pages', '_error.js.bak')
    await fs.promises.copyFile(targetPath, backupPath)
  }

  const sourcePath = path.resolve(__dirname, '../templates/_error.js')

  return fs.promises.copyFile(sourcePath, targetPath)
}

async function copyConfigFiles() {
  if (debug) {
    console.debug('cwd', process.cwd())
  }

  const templateDir = path.resolve(__dirname, '../templates')
  const files = await fs.promises.readdir(templateDir)
  const copyPromises = files.map((file) => {
    if (debug) {
      console.debug('copying', file)
    }

    return file === '_error.js' ? copyErrorJs() : fs.promises.copyFile(path.join(templateDir, file), file)
  });
  await Promise.all(copyPromises);
  console.log('Done copying config files.')
}

copyConfigFiles().catch((err) => {
  console.error(err)
  process.exit(1)
})

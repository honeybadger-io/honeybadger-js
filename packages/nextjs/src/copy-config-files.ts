#!/usr/bin/env node

const path = require('path')
const fs = require('fs')

const debug = process.env.HONEYBADGER_DEBUG === 'true'

function usesTypescript() {
  return fs.existsSync('tsconfig.json')
}

function usesAppRouter() {
  return fs.existsSync('app')
}

function getTargetPath(isGlobalErrorComponent = false) {
  const extension = usesTypescript() ? 'tsx' : 'js'
  const srcFolder = usesAppRouter() ? 'app' : 'pages'

  let fileName = ''
  if (usesAppRouter()) {
    fileName = isGlobalErrorComponent ? 'global-error' : 'error'
  }
  else {
    fileName = '_error'
  }

  return path.join(srcFolder, fileName + '.' + extension)
}

function getTemplate() {
  const templateName = usesAppRouter() ? '_error_app_router.js' : '_error.js'

  return path.resolve(__dirname, '../templates', templateName)
}

async function copyErrorJs() {
  const sourcePath = getTemplate()
  const targetPath = getTargetPath()

  return copyFileWithBackup(sourcePath, targetPath)
}

function copyGlobalErrorJs() {
  const sourcePath = getTemplate()
  const targetPath = getTargetPath(true)

  return copyFileWithBackup(sourcePath, targetPath)
}

async function copyFileWithBackup(sourcePath, targetPath) {
  const fileAlreadyExists = fs.existsSync(targetPath)
  if (fileAlreadyExists) {
    // Don't overwrite an existing file without creating a backup first
    const backupPath = targetPath + '.bak'
    await fs.promises.copyFile(targetPath, backupPath)
  }

  return fs.promises.copyFile(sourcePath, targetPath)
}

async function copyConfigFiles() {
  if (debug) {
    console.debug('cwd', process.cwd())
  }

  const templateDir = path.resolve(__dirname, '../templates')
  const configFiles = [
    'honeybadger.browser.config.js',
    'honeybadger.edge.config.js',
    'honeybadger.server.config.js',
  ]

  const copyPromises = configFiles.map((file) => {
    if (debug) {
      console.debug('copying', file)
    }
    return fs.promises.copyFile(path.join(templateDir, file), file)
  })
  copyPromises.push(copyErrorJs())

  if (usesAppRouter()) {
    copyPromises.push(copyGlobalErrorJs())
  }

  await Promise.all(copyPromises);

  console.log('Done copying config files.')
}

copyConfigFiles().catch((err) => {
  console.error(err)
  process.exit(1)
})

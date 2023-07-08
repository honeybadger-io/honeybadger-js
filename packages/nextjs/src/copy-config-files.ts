#!/usr/bin/env node

const path = require('path')
const fs = require('fs')

const debug = process.env.HONEYBADGER_DEBUG === 'true'

function usesTypescript() {
  return fs.existsSync('tsconfig.json')
}

function usesPagesRouter() {
  return fs.existsSync('pages')
}

function usesAppRouter() {
  return fs.existsSync('app')
}

function getTargetPath(isAppRouter = false, isGlobalErrorComponent = false) {
  if (!isAppRouter && isGlobalErrorComponent) {
    throw new Error('invalid arguments: isGlobalErrorComponent can only be true when isAppRouter is true')
  }

  const extension = usesTypescript() ? 'tsx' : 'js'
  const srcFolder = isAppRouter ? 'app' : 'pages'

  let fileName = ''
  if (isAppRouter) {
    fileName = isGlobalErrorComponent ? 'global-error' : 'error'
  }
  else {
    fileName = '_error'
  }

  return path.join(srcFolder, fileName + '.' + extension)
}

function getTemplate(isAppRouter = false, isGlobalErrorComponent = false) {
  if (!isAppRouter && isGlobalErrorComponent) {
    throw new Error('invalid arguments: isGlobalErrorComponent can only be true when isAppRouter is true')
  }

  const extension = isGlobalErrorComponent ? 'tsx' : 'js'
  const templateName = isAppRouter ? '_error_app_router' : '_error'

  return path.resolve(__dirname, '../templates', templateName + '.' + extension)
}

async function copyErrorJs(isAppRouter = false) {
  const sourcePath = getTemplate(isAppRouter)
  const targetPath = getTargetPath(isAppRouter)

  return copyFileWithBackup(sourcePath, targetPath)
}

function copyGlobalErrorJs() {
  const sourcePath = getTemplate(true, true)
  const targetPath = getTargetPath(true, true)

  return copyFileWithBackup(sourcePath, targetPath)
}

async function copyFileWithBackup(sourcePath, targetPath) {
  const fileAlreadyExists = fs.existsSync(targetPath)
  if (fileAlreadyExists) {
    // Don't overwrite an existing file without creating a backup first
    const backupPath = targetPath + '.bak'
    if (debug) {
      console.debug('backing up', targetPath, 'to', backupPath)
    }
    await fs.promises.copyFile(targetPath, backupPath)
  }

  if (debug) {
    console.debug('copying', sourcePath, 'to', targetPath)
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

  if (usesPagesRouter()) {
    copyPromises.push(copyErrorJs(false))
  }

  if (usesAppRouter()) {
    copyPromises.push(copyErrorJs(true))
    copyPromises.push(copyGlobalErrorJs())
  }

  await Promise.all(copyPromises);

  console.log('Done copying config files.')
}

copyConfigFiles().catch((err) => {
  console.error(err)
  process.exit(1)
})

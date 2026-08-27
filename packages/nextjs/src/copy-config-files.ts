const path = require('path')
const fs = require('fs')

const debug = process.env.HONEYBADGER_DEBUG === 'true'

function usesTypescript() {
  return fs.existsSync('tsconfig.json')
}

function usesSrcFolder() {
  return fs.existsSync('src')
}

function usesPagesRouter(isUnderSrc: boolean) {
  const srcFolder = isUnderSrc ? 'src' : ''

  return fs.existsSync(path.join(srcFolder, 'pages'))
}

function usesAppRouter(isUnderSrc: boolean) {
  const srcFolder = isUnderSrc ? 'src' : ''

  return fs.existsSync(path.join(srcFolder, 'app'))
}

function getTargetPath(isUnderSrc: boolean, isAppRouter = false, isGlobalErrorComponent = false) {
  if (!isAppRouter && isGlobalErrorComponent) {
    throw new Error('invalid arguments: isGlobalErrorComponent can only be true when isAppRouter is true')
  }

  const extension = usesTypescript() ? 'tsx' : 'js'
  let srcFolder = isUnderSrc ? 'src' : ''
  srcFolder = path.join(srcFolder, isAppRouter ? 'app' : 'pages')

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

  const templateName = isAppRouter ? '_error_app_router' : '_error'

  // `_error_app_router` ships as a JS/TS pair that differs only by the prop type
  // annotation, so pick the one matching the target file's extension. Previously this
  // hardcoded `tsx` for the global-error component, which copied annotated TSX into a
  // plain `.js` file in JavaScript projects. `_error` is JS-only, so it has no pair.
  const hasTypedVariant = isAppRouter
  const extension = hasTypedVariant && usesTypescript() ? 'tsx' : 'js'

  return path.resolve(__dirname, '../templates', templateName + '.' + extension)
}

async function copyErrorJs(isUnderSrc: boolean, isAppRouter = false) {
  const sourcePath = getTemplate(isAppRouter)
  const targetPath = getTargetPath(isUnderSrc, isAppRouter)

  return copyFileWithBackup(sourcePath, targetPath)
}

function copyGlobalErrorJs(isUnderSrc: boolean) {
  const sourcePath = getTemplate(true, true)
  const targetPath = getTargetPath(isUnderSrc, true, true)

  return copyFileWithBackup(sourcePath, targetPath)
}

/**
 * `instrumentation` and `instrumentation-client` are Next.js file conventions, so unlike
 * the `honeybadger.*.config` files they must sit at the project root — or inside `src/`
 * when the project uses one. The config files stay at the root either way, so the
 * relative import has to be rewritten when the instrumentation file lands in `src/`.
 */
async function copyInstrumentationFile(name: string, isUnderSrc: boolean) {
  const sourcePath = path.resolve(__dirname, '../templates', name + '.js')
  const srcFolder = isUnderSrc ? 'src' : ''
  const extension = usesTypescript() ? 'ts' : 'js'
  const targetPath = path.join(srcFolder, name + '.' + extension)

  // Unlike the honeybadger.* files, `instrumentation` is a shared Next.js convention:
  // other tools register their own hooks in it. Overwriting it would silently stop them
  // running, and a .bak file is no help if nobody notices, so leave an existing file
  // alone and print what to add instead.
  const existingPath = ['ts', 'js', 'mjs']
    .map((ext) => path.join(srcFolder, name + '.' + ext))
    .find((candidate) => fs.existsSync(candidate))

  if (existingPath) {
    console.log(
      `\nSkipped ${existingPath} because it already exists — it may register hooks for ` +
      'other tools.\nAdd Honeybadger to it by hand; see ' +
      `${path.relative(process.cwd(), sourcePath)} for the contents to merge in.`
    )
    return
  }

  let contents = await fs.promises.readFile(sourcePath, 'utf8')
  if (isUnderSrc) {
    contents = contents.replace(/(['"])\.\/honeybadger\./g, '$1../honeybadger.')
  }

  if (debug) {
    console.debug('writing', targetPath)
  }

  return fs.promises.writeFile(targetPath, contents)
}

async function backup(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return
  }

  // Don't overwrite an existing file without creating a backup first
  const backupPath = targetPath + '.bak'
  if (debug) {
    console.debug('backing up', targetPath, 'to', backupPath)
  }

  return fs.promises.copyFile(targetPath, backupPath)
}

async function copyFileWithBackup(sourcePath, targetPath) {
  await backup(targetPath)

  if (debug) {
    console.debug('copying', sourcePath, 'to', targetPath)
  }

  return fs.promises.copyFile(sourcePath, targetPath)
}

export async function copyConfigFiles() {
  if (debug) {
    console.debug('cwd', process.cwd())
  }

  const templateDir = path.resolve(__dirname, '../templates')
  // The browser config is gone: `instrumentation-client` now configures the browser,
  // and it runs before hydration rather than via a bundler-injected entry point.
  const configFiles = [
    'honeybadger.edge.config.js',
    'honeybadger.server.config.js',
  ]

  const copyPromises = configFiles.map((file) => {
    if (debug) {
      console.debug('copying', file)
    }
    return fs.promises.copyFile(path.join(templateDir, file), file)
  })

  const isUnderSrcFolder = usesSrcFolder()

  copyPromises.push(copyInstrumentationFile('instrumentation', isUnderSrcFolder))
  copyPromises.push(copyInstrumentationFile('instrumentation-client', isUnderSrcFolder))

  if (usesPagesRouter(isUnderSrcFolder)) {
    copyPromises.push(copyErrorJs(isUnderSrcFolder, false))
  }

  if (usesAppRouter(isUnderSrcFolder)) {
    copyPromises.push(copyErrorJs(isUnderSrcFolder, true))
    copyPromises.push(copyGlobalErrorJs(isUnderSrcFolder))
  }

  await Promise.all(copyPromises);

  console.log('Done copying config files.')
}

const path = require('path')
const fs = require('fs')

const debug = process.env.HONEYBADGER_DEBUG === 'true'

function usesTypescript() {
  return fs.existsSync('tsconfig.json')
}

/**
 * Where a router directory actually lives: `''` for the project root, `'src'`, or `null`
 * when the project does not use that router.
 *
 * Previously this was inferred from a single "does a `src` directory exist" check, which
 * broke the common layout of a root `app/` (or `pages/`) beside a `src/` folder used for
 * something else: everything was looked for under `src/`, found nothing, and no error
 * components were written at all. Root wins when a directory somehow exists in both
 * places, matching Next.js.
 */
function locateRouterDir(router: 'app' | 'pages'): string | null {
  if (fs.existsSync(router)) {
    return ''
  }

  if (fs.existsSync(path.join('src', router))) {
    return 'src'
  }

  return null
}

/**
 * Where Next.js resolves the `instrumentation` files. It derives that directory as the
 * parent of `pagesDir || appDir`:
 *
 *   const rootDir = path.join((pagesDir || appDir)!, '..')
 *   — packages/next/src/build/index.ts
 *
 * So it is the parent of whichever router directory is found, and the Pages Router wins
 * when a project has both. A project with a root `app/` and a `src/pages/` therefore
 * resolves instrumentation under `src/`, not at the root.
 *
 * Getting this wrong is silent — the file is written somewhere Next.js never reads, so
 * nothing is instrumented and nothing complains.
 */
function instrumentationDir(): string {
  const pagesDir = locateRouterDir('pages')
  if (pagesDir !== null) {
    return pagesDir
  }

  return locateRouterDir('app') ?? ''
}

function getTargetPath(routerDir: string, isAppRouter = false, isGlobalErrorComponent = false) {
  if (!isAppRouter && isGlobalErrorComponent) {
    throw new Error('invalid arguments: isGlobalErrorComponent can only be true when isAppRouter is true')
  }

  const extension = usesTypescript() ? 'tsx' : 'js'
  const srcFolder = path.join(routerDir, isAppRouter ? 'app' : 'pages')

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

async function copyErrorJs(routerDir: string, isAppRouter = false) {
  const sourcePath = getTemplate(isAppRouter)
  const targetPath = getTargetPath(routerDir, isAppRouter)

  return copyFileWithBackup(sourcePath, targetPath)
}

function copyGlobalErrorJs(routerDir: string) {
  const sourcePath = getTemplate(true, true)
  const targetPath = getTargetPath(routerDir, true, true)

  return copyFileWithBackup(sourcePath, targetPath)
}

/**
 * `instrumentation` and `instrumentation-client` are Next.js file conventions, so unlike
 * the `honeybadger.*.config` files their location is dictated by Next.js — see
 * `instrumentationDir` for the rule.
 *
 * The config files always stay at the project root, so when the instrumentation file
 * lands in `src/` instead its relative import has to climb one level.
 */
async function copyInstrumentationFile(name: string, srcFolder: string) {
  const sourcePath = path.resolve(__dirname, '../templates', name + '.js')
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
  if (srcFolder) {
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

  const instrumentationFolder = instrumentationDir()
  copyPromises.push(copyInstrumentationFile('instrumentation', instrumentationFolder))
  copyPromises.push(copyInstrumentationFile('instrumentation-client', instrumentationFolder))

  const pagesDir = locateRouterDir('pages')
  if (pagesDir !== null) {
    copyPromises.push(copyErrorJs(pagesDir, false))
  }

  const appDir = locateRouterDir('app')
  if (appDir !== null) {
    copyPromises.push(copyErrorJs(appDir, true))
    copyPromises.push(copyGlobalErrorJs(appDir))
  }

  await Promise.all(copyPromises);

  console.log('Done copying config files.')
}

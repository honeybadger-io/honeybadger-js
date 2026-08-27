import mock from 'mock-fs'
import fs from 'fs'
import path from 'path'
import { copyConfigFiles } from './copy-config-files';
describe('copy-config-files', () => {

  // mock-fs replaces the real filesystem; Jest's BufferedConsole lazily reads
  // jest-util from disk when logging. Under pnpm that path lives deep in
  // node_modules/.pnpm and isn't present in the mock, so console.log throws.
  // The production log isn't under test — stub it while the fs is mocked.
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
    mock.restore()
  })

  it('should copy config files to a project with pages router', async () => {
    mock({
      'templates': mock.load(path.resolve(__dirname, '..', 'templates')),
      'pages': {
        'index.js': 'dummy content'
      }
    })

    await copyConfigFiles()

    // replaced by instrumentation-client, which runs before hydration
    expect(fs.existsSync('honeybadger.browser.config.js')).toBe(false)
    expect(fs.existsSync('instrumentation.js')).toBe(true)
    expect(fs.existsSync('instrumentation-client.js')).toBe(true)
    expect(fs.existsSync('honeybadger.edge.config.js')).toBe(true)
    expect(fs.existsSync('honeybadger.server.config.js')).toBe(true)
    expect(fs.existsSync('pages/_error.js')).toBe(true)
    expect(fs.existsSync('app/error.js')).toBe(false)
  })

  it('should copy config files to a project with app router', async () => {
    mock({
      'templates': mock.load(path.resolve(__dirname, '..', 'templates')),
      'app': {
        'index.js': 'dummy content'
      }
    })

    await copyConfigFiles()

    // replaced by instrumentation-client, which runs before hydration
    expect(fs.existsSync('honeybadger.browser.config.js')).toBe(false)
    expect(fs.existsSync('instrumentation.js')).toBe(true)
    expect(fs.existsSync('instrumentation-client.js')).toBe(true)
    expect(fs.existsSync('honeybadger.edge.config.js')).toBe(true)
    expect(fs.existsSync('honeybadger.server.config.js')).toBe(true)
    expect(fs.existsSync('app/error.js')).toBe(true)
    expect(fs.existsSync('app/global-error.js')).toBe(true)
    expect(fs.existsSync('pages/_error.js')).toBe(false)
  })

  it('should copy config files to a project with pages router under src folder', async () => {
    mock({
      'templates': mock.load(path.resolve(__dirname, '..', 'templates')),
      'src': {
        'pages': {
          'index.js': 'dummy content'
        }
      }
    })

    await copyConfigFiles()

    // replaced by instrumentation-client, which runs before hydration
    expect(fs.existsSync('honeybadger.browser.config.js')).toBe(false)
    expect(fs.existsSync('src/instrumentation.js')).toBe(true)
    expect(fs.existsSync('src/instrumentation-client.js')).toBe(true)
    expect(fs.existsSync('honeybadger.edge.config.js')).toBe(true)
    expect(fs.existsSync('honeybadger.server.config.js')).toBe(true)
    expect(fs.existsSync('src/pages/_error.js')).toBe(true)
    expect(fs.existsSync('pages/_error.js')).toBe(false)
  })

  it('should copy config files to a project with app router under src folder', async () => {
    mock({
      'templates': mock.load(path.resolve(__dirname, '..', 'templates')),
      'src': {
        'app': {
          'index.js': 'dummy content'
        }
      }
    })

    await copyConfigFiles()

    // replaced by instrumentation-client, which runs before hydration
    expect(fs.existsSync('honeybadger.browser.config.js')).toBe(false)
    expect(fs.existsSync('src/instrumentation.js')).toBe(true)
    expect(fs.existsSync('src/instrumentation-client.js')).toBe(true)
    expect(fs.existsSync('honeybadger.edge.config.js')).toBe(true)
    expect(fs.existsSync('honeybadger.server.config.js')).toBe(true)
    expect(fs.existsSync('src/app/error.js')).toBe(true)
    expect(fs.existsSync('src/app/global-error.js')).toBe(true)
    expect(fs.existsSync('app/error.js')).toBe(false)
    expect(fs.existsSync('app/global-error.js')).toBe(false)
  })

  it('should copy config files to a typescript project with pages router', async () => {
    mock({
      'templates': mock.load(path.resolve(__dirname, '..', 'templates')),
      'pages': {
        'index.ts': 'dummy content'
      },
      'tsconfig.json': 'dummy content'
    })

    await copyConfigFiles()

    // replaced by instrumentation-client, which runs before hydration
    expect(fs.existsSync('honeybadger.browser.config.js')).toBe(false)
    expect(fs.existsSync('instrumentation.ts')).toBe(true)
    expect(fs.existsSync('instrumentation-client.ts')).toBe(true)
    expect(fs.existsSync('honeybadger.edge.config.js')).toBe(true)
    expect(fs.existsSync('honeybadger.server.config.js')).toBe(true)
    expect(fs.existsSync('pages/_error.tsx')).toBe(true)
    expect(fs.existsSync('pages/_error.js')).toBe(false)
    expect(fs.existsSync('app/error.tsx')).toBe(false)
  })

  it('should copy config files to a typescript project with app router', async () => {
    mock({
      'templates': mock.load(path.resolve(__dirname, '..', 'templates')),
      'app': {
        'index.ts': 'dummy content'
      },
      'tsconfig.json': 'dummy content'
    })

    await copyConfigFiles()

    // replaced by instrumentation-client, which runs before hydration
    expect(fs.existsSync('honeybadger.browser.config.js')).toBe(false)
    expect(fs.existsSync('instrumentation.ts')).toBe(true)
    expect(fs.existsSync('instrumentation-client.ts')).toBe(true)
    expect(fs.existsSync('honeybadger.edge.config.js')).toBe(true)
    expect(fs.existsSync('honeybadger.server.config.js')).toBe(true)
    expect(fs.existsSync('app/error.tsx')).toBe(true)
    expect(fs.existsSync('app/global-error.tsx')).toBe(true)
    expect(fs.existsSync('app/error.js')).toBe(false)
    expect(fs.existsSync('app/global-error.js')).toBe(false)
    expect(fs.existsSync('pages/error.tsx')).toBe(false)
  })

  it('should copy config files to a typescript project with pages router under src folder', async () => {
    mock({
      'templates': mock.load(path.resolve(__dirname, '..', 'templates')),
      'src': {
        'pages': {
          'index.ts': 'dummy content'
        },
      },
      'tsconfig.json': 'dummy content'
    })

    await copyConfigFiles()

    // replaced by instrumentation-client, which runs before hydration
    expect(fs.existsSync('honeybadger.browser.config.js')).toBe(false)
    expect(fs.existsSync('src/instrumentation.ts')).toBe(true)
    expect(fs.existsSync('src/instrumentation-client.ts')).toBe(true)
    expect(fs.existsSync('honeybadger.edge.config.js')).toBe(true)
    expect(fs.existsSync('honeybadger.server.config.js')).toBe(true)
    expect(fs.existsSync('src/pages/_error.tsx')).toBe(true)
    expect(fs.existsSync('src/pages/_error.js')).toBe(false)
    expect(fs.existsSync('pages/_error.tsx')).toBe(false)
    expect(fs.existsSync('pages/_error.js')).toBe(false)
  })

  it('should copy config files to a typescript project with app router under src folder', async () => {
    mock({
      'templates': mock.load(path.resolve(__dirname, '..', 'templates')),
      'src': {
        'app': {
          'index.ts': 'dummy content'
        },
      },
      'tsconfig.json': 'dummy content'
    })

    await copyConfigFiles()

    // replaced by instrumentation-client, which runs before hydration
    expect(fs.existsSync('honeybadger.browser.config.js')).toBe(false)
    expect(fs.existsSync('src/instrumentation.ts')).toBe(true)
    expect(fs.existsSync('src/instrumentation-client.ts')).toBe(true)
    expect(fs.existsSync('honeybadger.edge.config.js')).toBe(true)
    expect(fs.existsSync('honeybadger.server.config.js')).toBe(true)
    expect(fs.existsSync('src/app/error.tsx')).toBe(true)
    expect(fs.existsSync('src/app/global-error.tsx')).toBe(true)
    expect(fs.existsSync('src/app/error.js')).toBe(false)
    expect(fs.existsSync('src/app/global-error.js')).toBe(false)
    expect(fs.existsSync('app/error.tsx')).toBe(false)
    expect(fs.existsSync('app/error.js')).toBe(false)
  })

  it('should point the instrumentation import at the project root when using a src folder', async () => {
    mock({
      'templates': mock.load(path.resolve(__dirname, '..', 'templates')),
      'src': {
        'app': {
          'index.ts': 'dummy content'
        },
      },
      'tsconfig.json': 'dummy content'
    })

    await copyConfigFiles()

    // The config files stay at the project root while instrumentation.ts lives in src/,
    // so the generated import has to climb one level or it resolves to nothing.
    const contents = fs.readFileSync('src/instrumentation.ts', 'utf8')
    expect(contents).toContain("import('../honeybadger.server.config')")
    expect(contents).toContain("import('../honeybadger.edge.config')")
    expect(contents).not.toContain("'./honeybadger.")
  })

  it('should keep the instrumentation import relative to the root when there is no src folder', async () => {
    mock({
      'templates': mock.load(path.resolve(__dirname, '..', 'templates')),
      'app': {
        'index.js': 'dummy content'
      }
    })

    await copyConfigFiles()

    const contents = fs.readFileSync('instrumentation.js', 'utf8')
    expect(contents).toContain("import('./honeybadger.server.config')")
    expect(contents).not.toContain("'../honeybadger.")
  })

  describe('existing instrumentation files', () => {
    // instrumentation.ts is a shared Next.js convention - other tools register their
    // register()/onRequestError hooks there. Overwriting it would silently stop them.
    it('does not overwrite an existing instrumentation file', async () => {
      mock({
        'templates': mock.load(path.resolve(__dirname, '..', 'templates')),
        'app': { 'index.ts': 'dummy content' },
        'tsconfig.json': 'dummy content',
        'instrumentation.ts': 'export function register() { /* someone else got here first */ }'
      })

      await copyConfigFiles()

      expect(fs.readFileSync('instrumentation.ts', 'utf8')).toContain('someone else got here first')
      // and it is left in place rather than shuffled into a .bak nobody reads
      expect(fs.existsSync('instrumentation.ts.bak')).toBe(false)
      // the client half is untouched by the server half's presence
      expect(fs.existsSync('instrumentation-client.ts')).toBe(true)
    })

    it('detects an existing file with a different extension', async () => {
      mock({
        'templates': mock.load(path.resolve(__dirname, '..', 'templates')),
        'app': { 'index.ts': 'dummy content' },
        'tsconfig.json': 'dummy content',
        'instrumentation.js': 'export function register() { /* js flavour */ }'
      })

      await copyConfigFiles()

      // Would otherwise write instrumentation.ts alongside it, and Next.js would resolve
      // only one of the two.
      expect(fs.existsSync('instrumentation.ts')).toBe(false)
      expect(fs.readFileSync('instrumentation.js', 'utf8')).toContain('js flavour')
    })

    it('does not overwrite an existing instrumentation-client file', async () => {
      // instrumentation-client is a shared convention too: other tools initialise their
      // browser SDK there, and next.config's instrumentationClientInject exists precisely
      // because more than one tool expects to run in it.
      mock({
        'templates': mock.load(path.resolve(__dirname, '..', 'templates')),
        'app': { 'index.ts': 'dummy content' },
        'tsconfig.json': 'dummy content',
        'instrumentation-client.ts': '/* another tool initialises the browser here */'
      })

      await copyConfigFiles()

      expect(fs.readFileSync('instrumentation-client.ts', 'utf8')).toContain('another tool')
      expect(fs.existsSync('instrumentation-client.ts.bak')).toBe(false)
      // the server half is unaffected by the client half already existing
      expect(fs.existsSync('instrumentation.ts')).toBe(true)
    })

    it('leaves both alone when both already exist', async () => {
      mock({
        'templates': mock.load(path.resolve(__dirname, '..', 'templates')),
        'tsconfig.json': 'dummy content',
        'src': {
          'app': { 'index.ts': 'dummy content' },
          'instrumentation.ts': '/* existing server hooks */',
          'instrumentation-client.ts': '/* existing client init */'
        }
      })

      await copyConfigFiles()

      expect(fs.readFileSync('src/instrumentation.ts', 'utf8')).toContain('existing server hooks')
      expect(fs.readFileSync('src/instrumentation-client.ts', 'utf8')).toContain('existing client init')
    })

    it('still writes both files when neither exists', async () => {
      mock({
        'templates': mock.load(path.resolve(__dirname, '..', 'templates')),
        'app': { 'index.ts': 'dummy content' },
        'tsconfig.json': 'dummy content'
      })

      await copyConfigFiles()

      expect(fs.existsSync('instrumentation.ts')).toBe(true)
      expect(fs.existsSync('instrumentation-client.ts')).toBe(true)
    })
  })
})

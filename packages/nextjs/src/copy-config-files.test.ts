import mock from 'mock-fs'
import fs from 'fs'
import path from 'path'
import { copyConfigFiles } from './copy-config-files';
describe('copy-config-files', () => {

  afterEach(() => {
    mock.restore()
  })

  it('should copy config files to a project with pages router', () => {
    mock({
      'templates': mock.load(path.resolve(__dirname, '..', 'templates')),
      'pages': {
        'index.js': 'dummy content'
      }
    })

    return copyConfigFiles()
      .then(() => {
        expect(fs.existsSync('honeybadger.browser.config.js')).toBe(true)
        expect(fs.existsSync('honeybadger.edge.config.js')).toBe(true)
        expect(fs.existsSync('honeybadger.server.config.js')).toBe(true)
        expect(fs.existsSync('pages/_error.js')).toBe(true)
        expect(fs.existsSync('app/error.js')).toBe(false)
      })
  })

  it('should copy config files to a project with app router', () => {
    mock({
      'templates': mock.load(path.resolve(__dirname, '..', 'templates')),
      'app': {
        'index.js': 'dummy content'
      }
    })

    return copyConfigFiles()
      .then(() => {
        expect(fs.existsSync('honeybadger.browser.config.js')).toBe(true)
        expect(fs.existsSync('honeybadger.edge.config.js')).toBe(true)
        expect(fs.existsSync('honeybadger.server.config.js')).toBe(true)
        expect(fs.existsSync('app/error.js')).toBe(true)
        expect(fs.existsSync('app/global-error.js')).toBe(true)
        expect(fs.existsSync('pages/_error.js')).toBe(false)
      })
  })

  it('should copy config files to a project with pages router under src folder', () => {
    mock({
      'templates': mock.load(path.resolve(__dirname, '..', 'templates')),
      'src': {
        'pages': {
          'index.js': 'dummy content'
        }
      }
    })

    return copyConfigFiles()
      .then(() => {
        expect(fs.existsSync('honeybadger.browser.config.js')).toBe(true)
        expect(fs.existsSync('honeybadger.edge.config.js')).toBe(true)
        expect(fs.existsSync('honeybadger.server.config.js')).toBe(true)
        expect(fs.existsSync('src/pages/_error.js')).toBe(true)
        expect(fs.existsSync('pages/_error.js')).toBe(false)
      })
  })

  it('should copy config files to a project with app router under src folder', () => {
    mock({
      'templates': mock.load(path.resolve(__dirname, '..', 'templates')),
      'src': {
        'app': {
          'index.js': 'dummy content'
        }
      }
    })

    return copyConfigFiles()
      .then(() => {
        expect(fs.existsSync('honeybadger.browser.config.js')).toBe(true)
        expect(fs.existsSync('honeybadger.edge.config.js')).toBe(true)
        expect(fs.existsSync('honeybadger.server.config.js')).toBe(true)
        expect(fs.existsSync('src/app/error.js')).toBe(true)
        expect(fs.existsSync('src/app/global-error.js')).toBe(true)
        expect(fs.existsSync('app/error.js')).toBe(false)
        expect(fs.existsSync('app/global-error.js')).toBe(false)
      })
  })

  it('should copy config files to a typescript project with pages router', () => {
    mock({
      'templates': mock.load(path.resolve(__dirname, '..', 'templates')),
      'pages': {
        'index.ts': 'dummy content'
      },
      'tsconfig.json': 'dummy content'
    })

    return copyConfigFiles()
      .then(() => {
        expect(fs.existsSync('honeybadger.browser.config.js')).toBe(true)
        expect(fs.existsSync('honeybadger.edge.config.js')).toBe(true)
        expect(fs.existsSync('honeybadger.server.config.js')).toBe(true)
        expect(fs.existsSync('pages/_error.tsx')).toBe(true)
        expect(fs.existsSync('pages/_error.js')).toBe(false)
        expect(fs.existsSync('app/error.tsx')).toBe(false)
      })
  })

  it('should copy config files to a typescript project with app router', () => {
    mock({
      'templates': mock.load(path.resolve(__dirname, '..', 'templates')),
      'app': {
        'index.ts': 'dummy content'
      },
      'tsconfig.json': 'dummy content'
    })

    return copyConfigFiles()
      .then(() => {
        expect(fs.existsSync('honeybadger.browser.config.js')).toBe(true)
        expect(fs.existsSync('honeybadger.edge.config.js')).toBe(true)
        expect(fs.existsSync('honeybadger.server.config.js')).toBe(true)
        expect(fs.existsSync('app/error.tsx')).toBe(true)
        expect(fs.existsSync('app/global-error.tsx')).toBe(true)
        expect(fs.existsSync('app/error.js')).toBe(false)
        expect(fs.existsSync('app/global-error.js')).toBe(false)
        expect(fs.existsSync('pages/error.tsx')).toBe(false)
      })
  })

  it('should copy config files to a typescript project with pages router under src folder', () => {
    mock({
      'templates': mock.load(path.resolve(__dirname, '..', 'templates')),
      'src': {
        'pages': {
          'index.ts': 'dummy content'
        },
      },
      'tsconfig.json': 'dummy content'
    })

    return copyConfigFiles()
      .then(() => {
        expect(fs.existsSync('honeybadger.browser.config.js')).toBe(true)
        expect(fs.existsSync('honeybadger.edge.config.js')).toBe(true)
        expect(fs.existsSync('honeybadger.server.config.js')).toBe(true)
        expect(fs.existsSync('src/pages/_error.tsx')).toBe(true)
        expect(fs.existsSync('src/pages/_error.js')).toBe(false)
        expect(fs.existsSync('pages/_error.tsx')).toBe(false)
        expect(fs.existsSync('pages/_error.js')).toBe(false)
      })
  })

  it('should copy config files to a typescript project with app router under src folder', () => {
    mock({
      'templates': mock.load(path.resolve(__dirname, '..', 'templates')),
      'src': {
        'app': {
          'index.ts': 'dummy content'
        },
      },
      'tsconfig.json': 'dummy content'
    })

    return copyConfigFiles()
      .then(() => {
        expect(fs.existsSync('honeybadger.browser.config.js')).toBe(true)
        expect(fs.existsSync('honeybadger.edge.config.js')).toBe(true)
        expect(fs.existsSync('honeybadger.server.config.js')).toBe(true)
        expect(fs.existsSync('src/app/error.tsx')).toBe(true)
        expect(fs.existsSync('src/app/global-error.tsx')).toBe(true)
        expect(fs.existsSync('src/app/error.js')).toBe(false)
        expect(fs.existsSync('src/app/global-error.js')).toBe(false)
        expect(fs.existsSync('app/error.tsx')).toBe(false)
        expect(fs.existsSync('app/error.js')).toBe(false)
      })
  })

})

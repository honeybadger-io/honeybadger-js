import { expect } from 'chai'
import { extractSourcemapDataFromBundle, isNonProdEnv } from '../src/rollupUtils';
import bundle from './fixtures/bundle'
import path from 'node:path'
import { NormalizedOutputOptions } from 'rollup';
import * as td from 'testdouble'

describe('extractSourcemapDataFromBundle', () => {
  const outputOptions = td.object<NormalizedOutputOptions>()
  outputOptions.dir = 'dist'

  it('should return an array with sourcemap file data', () => {
    const data = extractSourcemapDataFromBundle(outputOptions, bundle, [])
    expect(data).to.be.an('array').lengthOf(3)
    expect(data).to.have.deep.members([
      {
        sourcemapFilename: 'index.js.map',
        sourcemapFilePath: path.resolve('dist/index.js.map'),
        jsFilename: 'index.js',
        jsFilePath: path.resolve('dist/index.js')
      },
      {
        sourcemapFilename: 'foo.js.map',
        sourcemapFilePath: path.resolve('dist/foo.js.map'),
        jsFilename: 'foo.js',
        jsFilePath: path.resolve('dist/foo.js')
      },
      {
        sourcemapFilename: 'subfolder/bar.js.map',
        sourcemapFilePath: path.resolve('dist/subfolder/bar.js.map'),
        jsFilename: 'subfolder/bar.js',
        jsFilePath: path.resolve('dist/subfolder/bar.js')
      },
    ])
  })

  const itEach = ['foo.js', /foo.js/, 'foo.*', /foo.*/]
  for (const ignorePath of itEach) {
    it(`should ignore files that match the ignorePaths ${ignorePath}`, () => {
      const data = extractSourcemapDataFromBundle(outputOptions, bundle, [ignorePath])
      expect(data).to.be.an('array').lengthOf(2)
      expect(data).to.have.deep.members([
        {
          sourcemapFilename: 'index.js.map',
          sourcemapFilePath: path.resolve('dist/index.js.map'),
          jsFilename: 'index.js',
          jsFilePath: path.resolve('dist/index.js')
        },
        {
          sourcemapFilename: 'subfolder/bar.js.map',
          sourcemapFilePath: path.resolve('dist/subfolder/bar.js.map'),
          jsFilename: 'subfolder/bar.js',
          jsFilePath: path.resolve('dist/subfolder/bar.js')
        },
      ])
    })
  }
})

describe('isNonProdEnv', () => {
  let restore

  beforeEach(() => {
    restore = process.env.NODE_ENV
  })

  afterEach(() => {
    process.env.NODE_ENV = restore
  })

  it('returns true if NODE_ENV is non-prod', () => {
    process.env.NODE_ENV = 'development'
    expect(isNonProdEnv()).to.equal(true)
  })

  it('returns false if NODE_ENV is missing', () => {
    delete process.env.NODE_ENV
    expect(isNonProdEnv()).to.equal(false)
  })

  it('returns false if NODE_ENV is prod', () => {
    process.env.NODE_ENV = 'production'
    expect(isNonProdEnv()).to.equal(false)
  })
})

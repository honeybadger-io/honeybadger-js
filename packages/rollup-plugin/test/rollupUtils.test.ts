import { expect } from 'chai'
import { extractSourcemapDataFromBundle, isDevEnv } from '../src/rollupUtils';
import bundle from './fixtures/bundle'
import path from 'node:path'
import { NormalizedOutputOptions } from 'rollup';
import * as td from 'testdouble'

describe('extractSourcemapDataFromBundle', () => {
  const outputOptions = td.object<NormalizedOutputOptions>()
  outputOptions.dir = 'dist'

  it('should return an array with sourcemap file data', () => {
    const data = extractSourcemapDataFromBundle(outputOptions, bundle, [])
    expect(data).to.be.an('array').lengthOf(4)
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
        sourcemapFilename: 'bar/bar.js.map',
        sourcemapFilePath: path.resolve('dist/bar/bar.js.map'),
        jsFilename: 'bar/bar.js',
        jsFilePath: path.resolve('dist/bar/bar.js')
      },
      {
        sourcemapFilename: 'sub/folder/baz.js.map',
        sourcemapFilePath: path.resolve('dist/sub/folder/baz.js.map'),
        jsFilename: 'sub/folder/baz.js',
        jsFilePath: path.resolve('dist/sub/folder/baz.js')
      },
    ])
  })

  const itEach = ['foo.js', '**/foo.js', 'foo.*', '**/foo.*', 'foo.js*', '**/foo.js*']
  for (const ignorePath of itEach) {
    it(`should ignore files that match the ignorePath ${ignorePath}`, () => {
      const data = extractSourcemapDataFromBundle(outputOptions, bundle, [ignorePath])
      expect(data).to.be.an('array').lengthOf(3)
      expect(data).to.have.deep.members([
        {
          sourcemapFilename: 'index.js.map',
          sourcemapFilePath: path.resolve('dist/index.js.map'),
          jsFilename: 'index.js',
          jsFilePath: path.resolve('dist/index.js')
        },
        {
          sourcemapFilename: 'bar/bar.js.map',
          sourcemapFilePath: path.resolve('dist/bar/bar.js.map'),
          jsFilename: 'bar/bar.js',
          jsFilePath: path.resolve('dist/bar/bar.js')
        },
        {
          sourcemapFilename: 'sub/folder/baz.js.map',
          sourcemapFilePath: path.resolve('dist/sub/folder/baz.js.map'),
          jsFilename: 'sub/folder/baz.js',
          jsFilePath: path.resolve('dist/sub/folder/baz.js')
        },
      ])
    })
  }

  it('should ignore files with empty sourcesContent', () => {
    expect(bundle).to.include.keys(['empty.js.map'])
    expect(bundle['empty.js.map']).to.deep.equal({
      fileName: 'empty.js.map',
      name: undefined,
      source: '{"version":3,"file":"empty.sass","sources":[], "sourcesContent": [], "names":[],"mappings":""}',
      type: 'asset' as const,
      needsCodeReference: false,
    })

    const data = extractSourcemapDataFromBundle(outputOptions, bundle, [])
    expect(data).to.be.an('array').lengthOf(4)
    expect(data).to.not.have.deep.members([
      {
        sourcemapFilename: 'empty.js.map',
        sourcemapFilePath: path.resolve('dist/empty.js.map'),
        jsFilename: 'empty.js',
        jsFilePath: path.resolve('dist/empty.js')
      },
    ])
  })
})

describe('isDevEnv', () => {
  const developmentEnvironments = ['dev', 'development', 'test']
  let restore

  beforeEach(() => {
    restore = process.env.NODE_ENV
  })

  afterEach(() => {
    process.env.NODE_ENV = restore
  })

  it('returns true if NODE_ENV is non-prod', () => {
    process.env.NODE_ENV = 'development'
    expect(isDevEnv(developmentEnvironments)).to.equal(true)
  })

  it('returns false if NODE_ENV is non-prod but not in developmentEnvironments array', () => {
    process.env.NODE_ENV = 'staging'
    expect(isDevEnv(developmentEnvironments)).to.equal(false)
  })

  it('returns false if NODE_ENV is missing', () => {
    delete process.env.NODE_ENV
    expect(isDevEnv(developmentEnvironments)).to.equal(false)
  })

  it('returns false if NODE_ENV is prod', () => {
    process.env.NODE_ENV = 'production'
    expect(isDevEnv(developmentEnvironments)).to.equal(false)
  })
})

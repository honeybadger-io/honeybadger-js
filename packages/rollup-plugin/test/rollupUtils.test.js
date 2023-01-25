import { expect } from 'chai'
import { extractSourcemapDataFromBundle } from '../src/rollupUtils.js';
import bundle from './fixtures/bundle.js'
import path from 'node:path'

describe('extractSourcemapDataFromBundle', () => {
  const outputOptions = { dir: 'dist' }

  it('should return an array with sourcemap file data', () => {
    const data = extractSourcemapDataFromBundle({ outputOptions, bundle })
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
});

import { expect } from './testSetup'
import { cleanOptions, uploadSourcemaps, sendDeployNotification } from '../src/index'

describe('Index', () => {
  it('Exports expcected utils', () => {
    expect(cleanOptions).to.be.a('function')
    expect(uploadSourcemaps).to.be.a('function')
    expect(sendDeployNotification).to.be.a('function')
  })
})

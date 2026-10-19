import type Singleton from '../../src/browser'
import { singletonKey } from '../../src/global-singleton'

// See the server test: resetting the module registry stands in for a bundler emitting a
// second copy of the package into the same realm.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const loadCopy = (): typeof Singleton => require('../../src/browser').default

const KEY = singletonKey('browser', loadCopy().getVersion())

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const global = globalThis as any

describe('browser singleton', () => {
  afterEach(() => {
    delete global[KEY]
    jest.resetModules()
  })

  it('hands the same client to every copy of the module', () => {
    const first = loadCopy()
    jest.resetModules()
    const second = loadCopy()

    expect(second).toBe(first)
  })

  it('keeps the configuration made through another copy', () => {
    const first = loadCopy()
    first.configure({ apiKey: 'test-key' })

    jest.resetModules()
    const second = loadCopy()

    expect(second.config.apiKey).toBe('test-key')
  })
})

import type Singleton from '../../src/server'
import { singletonKey } from '../../src/global-singleton'

// A bundler that emits two copies of the package gives each copy its own module scope.
// jest.resetModules() reproduces that: the module is evaluated again, while the realm --
// and so the global object the singleton lives on -- stays the same.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const loadCopy = (): typeof Singleton => require('../../src/server').default

// Derived once from a real client rather than spelled out: the version is substituted by
// rollup at bundle time, so it is still the literal placeholder here.
const KEY = singletonKey('server', loadCopy().getVersion())

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const global = globalThis as any

// Configuring a server client installs process listeners, and every module reload here
// builds another one. Only the listeners this suite added are removed: `process` is
// shared with the rest of the run, so anything already registered has to survive.
const EVENTS = ['uncaughtException', 'unhandledRejection', 'SIGTERM', 'SIGINT', 'beforeExit']
// `process.listeners` is typed for signals only; these event names are not all signals.
const listenersFor = (event: string) => process.listeners(event as NodeJS.Signals)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let preexisting: Record<string, any[]>

describe('server singleton', () => {
  beforeEach(() => {
    preexisting = {}
    EVENTS.forEach((event) => { preexisting[event] = listenersFor(event) })
  })

  afterEach(() => {
    delete global[KEY]
    jest.resetModules()
    EVENTS.forEach((event) => {
      listenersFor(event)
        .filter((listener) => !preexisting[event].includes(listener))
        .forEach((listener) => process.removeListener(event as NodeJS.Signals, listener))
    })
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

  it('ignores a value in the slot that this package did not store', () => {
    global[KEY] = { notify: jest.fn(), configure: jest.fn() }
    jest.resetModules()

    const client = loadCopy()

    expect(client.notify).toBe(Object.getPrototypeOf(client).notify)
    expect(global[KEY]).toBe(client)
  })
})

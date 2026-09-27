import {
  DISABLE_GLOBAL_SINGLETON_KEY,
  getOrCreateSingleton,
  singletonKey,
} from '../../src/global-singleton'

// The version is substituted by rollup at bundle time, so it is still the literal
// placeholder here. Every assertion derives the key rather than spelling it out.
const VERSION = '6.0.0'

const clientLike = (name: string) => ({
  name,
  notify: () => undefined,
  configure: () => undefined,
})

describe('getOrCreateSingleton', () => {
  let global: Record<string, unknown>

  beforeEach(() => {
    global = {}
  })

  it('creates the client and stores it on the global object', () => {
    const client = clientLike('created')

    const result = getOrCreateSingleton('server', VERSION, () => client, global)

    expect(result).toBe(client)
    expect(global[singletonKey('server', VERSION)]).toBe(client)
  })

  it('stores the client in a non-enumerable property', () => {
    getOrCreateSingleton('server', VERSION, () => clientLike('created'), global)

    expect(Object.keys(global)).not.toContain(singletonKey('server', VERSION))
  })

  it('returns the stored client without calling the factory again', () => {
    const stored = clientLike('stored')
    const create = jest.fn(() => clientLike('created'))
    getOrCreateSingleton('server', VERSION, () => stored, global)

    const result = getOrCreateSingleton('server', VERSION, create, global)

    expect(result).toBe(stored)
    expect(create).not.toHaveBeenCalled()
  })

  it('keeps the browser and server clients apart', () => {
    const server = clientLike('server')
    const browser = clientLike('browser')

    getOrCreateSingleton('server', VERSION, () => server, global)
    const result = getOrCreateSingleton('browser', VERSION, () => browser, global)

    expect(result).toBe(browser)
    expect(global[singletonKey('server', VERSION)]).toBe(server)
  })

  it('keeps different versions apart, so an older copy is never handed to a newer caller', () => {
    const older = clientLike('6.10.0')
    const newer = clientLike('6.16.3')

    getOrCreateSingleton('server', '6.10.0', () => older, global)
    const result = getOrCreateSingleton('server', '6.16.3', () => newer, global)

    expect(result).toBe(newer)
  })

  it('replaces a slot this package did not write, however client-shaped it looks', () => {
    const client = clientLike('created')
    global[singletonKey('server', VERSION)] = clientLike('impostor')

    const result = getOrCreateSingleton('server', VERSION, () => client, global)

    expect(result).toBe(client)
    expect(global[singletonKey('server', VERSION)]).toBe(client)
  })

  it('neither reads nor writes the global object when sharing is disabled', () => {
    const stored = clientLike('stored')
    const created = clientLike('created')
    global[DISABLE_GLOBAL_SINGLETON_KEY] = true
    global[singletonKey('server', VERSION)] = stored

    const result = getOrCreateSingleton('server', VERSION, () => created, global)

    expect(result).toBe(created)
    expect(global[singletonKey('server', VERSION)]).toBe(stored)
  })

  it('still returns a client when the global object is frozen', () => {
    const client = clientLike('created')
    const frozen = Object.freeze({}) as Record<string, unknown>

    expect(() => getOrCreateSingleton('server', VERSION, () => client, frozen)).not.toThrow()
    expect(getOrCreateSingleton('server', VERSION, () => client, frozen)).toBe(client)
  })

  it('falls back to a local client when there is no global object', () => {
    const client = clientLike('created')
    const noGlobal = null as unknown as Record<string, unknown>

    expect(getOrCreateSingleton('server', VERSION, () => client, noGlobal)).toBe(client)
  })
})

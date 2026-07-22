import { Plugins } from '../src'

describe('Plugins', () => {
  it('exposes consoleEvents', () => {
    expect(typeof Plugins.consoleEvents).toBe('function')
  })

  it('keeps `events` as a backwards-compatible alias for consoleEvents', () => {
    // `Plugins.events` was the public name before it was renamed to
    // `consoleEvents`; keep the alias so existing consumers don't get `undefined`.
    expect(Plugins.events).toBe(Plugins.consoleEvents)
  })
})

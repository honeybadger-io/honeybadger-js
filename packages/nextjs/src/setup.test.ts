import type { NextConfig } from 'next'
import { withHoneybadgerConfig } from './setup'

const uploadSourceMapsAfterBuild = jest.fn()
let uploadConfigured = false
jest.mock('./source-maps', () => ({
  uploadSourceMapsAfterBuild: (...args: unknown[]) => uploadSourceMapsAfterBuild(...args),
  isSourceMapUploadConfigured: () => uploadConfigured,
}))

type Config = NextConfig & {
  compiler?: { runAfterProductionCompile?: (metadata: { distDir: string; projectDir: string }) => unknown }
}

const metadata = { distDir: '.next', projectDir: '/app' }

describe('withHoneybadgerConfig', () => {
  beforeEach(() => {
    uploadConfigured = false
    uploadSourceMapsAfterBuild.mockReset().mockResolvedValue(undefined)
  })

  describe('serverExternalPackages', () => {
    it('adds the package when the option is absent', () => {
      const result = withHoneybadgerConfig({}) as Config

      expect(result.serverExternalPackages).toEqual(['@honeybadger-io/js'])
    })

    it('appends to an existing list rather than replacing it', () => {
      const result = withHoneybadgerConfig({ serverExternalPackages: ['other-package'] }) as Config

      expect(result.serverExternalPackages).toEqual(['other-package', '@honeybadger-io/js'])
    })

    it('does not add the package twice', () => {
      const result = withHoneybadgerConfig({
        serverExternalPackages: ['@honeybadger-io/js'],
      }) as Config

      expect(result.serverExternalPackages).toEqual(['@honeybadger-io/js'])
    })

    it('leaves the rest of the config untouched', () => {
      const result = withHoneybadgerConfig({ reactStrictMode: true, basePath: '/app' }) as Config

      expect(result).toMatchObject({ reactStrictMode: true, basePath: '/app' })
    })

    it('does not mutate the config it was given', () => {
      const original: Config = { serverExternalPackages: ['other-package'] }

      withHoneybadgerConfig(original)

      expect(original.serverExternalPackages).toEqual(['other-package'])
      expect(original.compiler).toBeUndefined()
    })
  })

  describe('source map upload', () => {
    it('registers the post-compile hook', async () => {
      const result = withHoneybadgerConfig({}) as Config

      await result.compiler?.runAfterProductionCompile?.(metadata)

      expect(uploadSourceMapsAfterBuild).toHaveBeenCalledWith(undefined, metadata, expect.anything())
    })

    it('passes the Honeybadger config through to the upload', async () => {
      const hbConfig = { apiKey: 'k', assetsUrl: 'https://example.com/_next' }
      const result = withHoneybadgerConfig({}, hbConfig) as Config

      await result.compiler?.runAfterProductionCompile?.(metadata)

      expect(uploadSourceMapsAfterBuild).toHaveBeenCalledWith(hbConfig, metadata, expect.anything())
    })

    // The hook is a single function, so replacing it outright would silently disable
    // whatever the project already registered there.
    it('runs an existing hook as well, and first', async () => {
      const order: string[] = []
      uploadSourceMapsAfterBuild.mockImplementation(async () => { order.push('honeybadger') })
      const existing = jest.fn(async () => { order.push('existing') })

      const result = withHoneybadgerConfig({
        compiler: { runAfterProductionCompile: existing },
      }) as Config
      await result.compiler?.runAfterProductionCompile?.(metadata)

      expect(existing).toHaveBeenCalledWith(metadata)
      expect(order).toEqual(['existing', 'honeybadger'])
    })

    it('lets an existing hook failure fail the build, without uploading', async () => {
      const existing = jest.fn(async () => { throw new Error('their hook broke') })

      const result = withHoneybadgerConfig({
        compiler: { runAfterProductionCompile: existing },
      }) as Config

      await expect(result.compiler?.runAfterProductionCompile?.(metadata))
        .rejects.toThrow('their hook broke')
      expect(uploadSourceMapsAfterBuild).not.toHaveBeenCalled()
    })

    it('preserves other compiler options', () => {
      const result = withHoneybadgerConfig({
        compiler: { removeConsole: true } as Record<string, unknown>,
      }) as Config

      expect(result.compiler).toMatchObject({ removeConsole: true })
      expect(typeof result.compiler?.runAfterProductionCompile).toBe('function')
    })
  })

  describe('productionBrowserSourceMaps', () => {
    // Next.js emits no production browser source maps by default, so upload would find
    // nothing. The webpack plugin this replaces got them via `devtool: hidden-source-map`,
    // which has no Turbopack equivalent.
    it('turns it on when upload is configured, and deletes the maps afterwards', async () => {
      uploadConfigured = true

      const result = withHoneybadgerConfig({}) as Config
      await result.compiler?.runAfterProductionCompile?.(metadata)

      expect(result.productionBrowserSourceMaps).toBe(true)
      expect(uploadSourceMapsAfterBuild).toHaveBeenCalledWith(
        undefined, metadata, { deleteBrowserSourcemaps: true }
      )
    })

    it('leaves it alone when upload is not configured', () => {
      uploadConfigured = false

      const result = withHoneybadgerConfig({}) as Config

      expect(result.productionBrowserSourceMaps).toBeUndefined()
    })

    // Somebody who asked for served source maps meant it, so we neither re-enable nor
    // delete behind them.
    it('respects an explicit true, and does not delete their maps', async () => {
      uploadConfigured = true

      const result = withHoneybadgerConfig({ productionBrowserSourceMaps: true }) as Config
      await result.compiler?.runAfterProductionCompile?.(metadata)

      expect(result.productionBrowserSourceMaps).toBe(true)
      expect(uploadSourceMapsAfterBuild).toHaveBeenCalledWith(
        undefined, metadata, { deleteBrowserSourcemaps: false }
      )
    })

    it('respects an explicit false', () => {
      uploadConfigured = true

      const result = withHoneybadgerConfig({ productionBrowserSourceMaps: false }) as Config

      expect(result.productionBrowserSourceMaps).toBe(false)
    })
  })

  // `productionBrowserSourceMaps` covers only the browser build. The webpack plugin this
  // replaces set `devtool: 'hidden-source-map'` with no `isServer` guard, so server maps
  // were written too — see honeybadger-js#1602. Without this option the hook has strictly
  // less to collect than the old plugin generated.
  describe('experimental.serverSourceMaps', () => {
    it('turns it on when upload is configured', () => {
      uploadConfigured = true

      const result = withHoneybadgerConfig({}) as Config

      expect(result.experimental?.serverSourceMaps).toBe(true)
    })

    it('does not introduce the key when upload is not configured', () => {
      uploadConfigured = false

      const result = withHoneybadgerConfig({}) as Config

      expect('experimental' in result).toBe(false)
    })

    it('preserves other experimental options', () => {
      uploadConfigured = true

      const result = withHoneybadgerConfig({
        experimental: { cssChunking: true } as Record<string, unknown>,
      }) as Config

      expect(result.experimental).toMatchObject({ cssChunking: true, serverSourceMaps: true })
    })

    it.each([true, false])('respects an explicit %s', (explicit) => {
      uploadConfigured = true

      const result = withHoneybadgerConfig({
        experimental: { serverSourceMaps: explicit },
      }) as Config

      expect(result.experimental?.serverSourceMaps).toBe(explicit)
    })

    // The browser switch is independent: somebody who set productionBrowserSourceMaps
    // themselves should still get server maps.
    it('turns it on even when the browser maps were set explicitly', () => {
      uploadConfigured = true

      const result = withHoneybadgerConfig({ productionBrowserSourceMaps: true }) as Config

      expect(result.experimental?.serverSourceMaps).toBe(true)
    })
  })
})

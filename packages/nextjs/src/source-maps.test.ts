import fs from 'fs'
import mock from 'mock-fs'
import { collectSourcemaps, resolveUploadOptions, uploadSourceMapsAfterBuild } from './source-maps'

const MAP_WITH_SOURCES = JSON.stringify({ version: 3, sources: ['a.ts'], sourcesContent: ['const a = 1'] })
const MAP_WITHOUT_SOURCES = JSON.stringify({ version: 3, sources: ['a.ts'], sourcesContent: [] })

const uploadSourcemaps = jest.fn()
const sendDeployNotification = jest.fn()
jest.mock('@honeybadger-io/plugin-core', () => {
  const actual = jest.requireActual('@honeybadger-io/plugin-core')
  return {
    ...actual,
    uploadSourcemaps: (...args: unknown[]) => uploadSourcemaps(...args),
    sendDeployNotification: (...args: unknown[]) => sendDeployNotification(...args),
  }
})

describe('collectSourcemaps', () => {
  afterEach(() => mock.restore())

  it('pairs each map with its js file, relative to distDir', async () => {
    mock({
      '.next': {
        'static': { 'chunks': { 'main.js': 'code', 'main.js.map': MAP_WITH_SOURCES } },
      },
    })

    const collected = await collectSourcemaps('.next')

    expect(collected).toHaveLength(1)
    expect(collected[0]).toMatchObject({
      // assetsUrl points at <origin>/_next, and .next/static/... is served at
      // /_next/static/..., so the name must be relative to distDir.
      jsFilename: 'static/chunks/main.js',
      sourcemapFilename: 'static/chunks/main.js.map',
    })
  })

  it('walks nested directories and both output roots', async () => {
    mock({
      '.next': {
        'static': { 'chunks': { 'app': { 'page.js': 'code', 'page.js.map': MAP_WITH_SOURCES } } },
        'server': { 'chunks': { 'handler.js': 'code', 'handler.js.map': MAP_WITH_SOURCES } },
      },
    })

    const names = (await collectSourcemaps('.next')).map((s) => s.jsFilename).sort()

    // Server chunks are included: not uploading them is exactly why server frames stay
    // minified today (#1602).
    expect(names).toEqual(['server/chunks/handler.js', 'static/chunks/app/page.js'])
  })

  it('skips maps with no sourcesContent', async () => {
    mock({
      '.next': {
        'static': {
          'useful.js': 'code',
          'useful.js.map': MAP_WITH_SOURCES,
          'empty.js': 'code',
          'empty.js.map': MAP_WITHOUT_SOURCES,
        },
      },
    })

    const names = (await collectSourcemaps('.next')).map((s) => s.jsFilename)

    expect(names).toEqual(['static/useful.js'])
  })

  it('skips a map whose js file is missing', async () => {
    mock({ '.next': { 'static': { 'orphan.js.map': MAP_WITH_SOURCES } } })

    expect(await collectSourcemaps('.next')).toHaveLength(0)
  })

  it('skips unparseable maps rather than failing the build', async () => {
    mock({ '.next': { 'static': { 'broken.js': 'code', 'broken.js.map': 'not json' } } })

    expect(await collectSourcemaps('.next')).toHaveLength(0)
  })

  it('honours ignorePaths', async () => {
    mock({
      '.next': {
        'static': { 'keep.js': 'code', 'keep.js.map': MAP_WITH_SOURCES },
        'server': { 'skip.js': 'code', 'skip.js.map': MAP_WITH_SOURCES },
      },
    })

    const names = (await collectSourcemaps('.next', ['skip.js'])).map((s) => s.jsFilename)

    expect(names).toEqual(['static/keep.js'])
  })

  it('returns nothing when the build directory is absent', async () => {
    mock({})

    expect(await collectSourcemaps('.next')).toHaveLength(0)
  })

  it('ignores files that are not source maps', async () => {
    mock({
      '.next': {
        'static': { 'main.js': 'code', 'main.js.map': MAP_WITH_SOURCES, 'styles.css': 'css', 'BUILD_ID': 'x' },
      },
    })

    expect(await collectSourcemaps('.next')).toHaveLength(1)
  })
})

describe('resolveUploadOptions', () => {
  const envKeys = [
    'NEXT_PUBLIC_HONEYBADGER_API_KEY',
    'NEXT_PUBLIC_HONEYBADGER_ASSETS_URL',
    'NEXT_PUBLIC_HONEYBADGER_REVISION',
  ]
  const saved: Record<string, string | undefined> = {}

  beforeEach(() => {
    envKeys.forEach((key) => { saved[key] = process.env[key]; delete process.env[key] })
    // The unconfigured cases warn by design; keep the test output readable.
    jest.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
    envKeys.forEach((key) => {
      if (saved[key] === undefined) { delete process.env[key] } else { process.env[key] = saved[key] }
    })
  })

  it('returns null when nothing is configured', () => {
    // cleanOptions throws on a missing apiKey, and Next re-throws whatever this hook
    // throws — so an unconfigured project must not reach it.
    expect(resolveUploadOptions({})).toBeNull()
  })

  it('returns null when upload is disabled', () => {
    expect(resolveUploadOptions({
      disableSourceMapUpload: true,
      apiKey: 'k',
      assetsUrl: 'https://example.com/_next',
    })).toBeNull()
  })

  it('falls back to the environment variables the templates use', () => {
    process.env.NEXT_PUBLIC_HONEYBADGER_API_KEY = 'env-key'
    process.env.NEXT_PUBLIC_HONEYBADGER_ASSETS_URL = 'https://example.com/_next'
    process.env.NEXT_PUBLIC_HONEYBADGER_REVISION = 'abc123'

    expect(resolveUploadOptions({})).toMatchObject({
      apiKey: 'env-key',
      assetsUrl: 'https://example.com/_next',
      revision: 'abc123',
    })
  })

  it('prefers explicit options over the environment', () => {
    process.env.NEXT_PUBLIC_HONEYBADGER_API_KEY = 'env-key'
    process.env.NEXT_PUBLIC_HONEYBADGER_ASSETS_URL = 'https://example.com/_next'

    expect(resolveUploadOptions({
      apiKey: 'explicit',
      assetsUrl: 'https://cdn.example.com/_next',
    })).toMatchObject({ apiKey: 'explicit', assetsUrl: 'https://cdn.example.com/_next' })
  })

  it('leaves the default revision alone when none is configured', () => {
    process.env.NEXT_PUBLIC_HONEYBADGER_API_KEY = 'env-key'
    process.env.NEXT_PUBLIC_HONEYBADGER_ASSETS_URL = 'https://example.com/_next'

    // cleanOptions merges as { ...defaults, ...options }, so passing revision: undefined
    // would overwrite the default rather than fall back to it — and a fault whose
    // revision does not match its source map never symbolicates.
    expect(resolveUploadOptions({})?.revision).toBe('main')
  })

  it('does not let other unset options clobber their defaults', () => {
    process.env.NEXT_PUBLIC_HONEYBADGER_API_KEY = 'env-key'
    process.env.NEXT_PUBLIC_HONEYBADGER_ASSETS_URL = 'https://example.com/_next'

    const options = resolveUploadOptions({
      apiKey: 'k', assetsUrl: 'u', endpoint: undefined, retries: undefined,
    })

    expect(options?.endpoint).toBe('https://api.honeybadger.io/v1/source_maps')
    expect(options?.retries).toBe(3)
  })

  it('returns null when only one of the two required values is present', () => {
    process.env.NEXT_PUBLIC_HONEYBADGER_API_KEY = 'env-key'

    expect(resolveUploadOptions({})).toBeNull()
  })
})

describe('uploadSourceMapsAfterBuild', () => {
  const configured = {
    apiKey: 'k',
    assetsUrl: 'https://example.com/_next',
  }
  let nodeEnv: string | undefined

  beforeEach(() => {
    nodeEnv = process.env.NODE_ENV
    jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    uploadSourcemaps.mockReset().mockResolvedValue(undefined)
    sendDeployNotification.mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => {
    mock.restore()
    jest.restoreAllMocks()
    if (nodeEnv === undefined) { delete process.env.NODE_ENV } else { process.env.NODE_ENV = nodeEnv }
  })

  it('does nothing when upload is not configured', async () => {
    mock({ '.next': { 'static': { 'a.js': 'code', 'a.js.map': MAP_WITH_SOURCES } } })

    await uploadSourceMapsAfterBuild({}, { distDir: '.next', projectDir: '.' })

    expect(uploadSourcemaps).not.toHaveBeenCalled()
  })

  it('uploads the collected maps', async () => {
    process.env.NODE_ENV = 'production'
    mock({ '.next': { 'static': { 'a.js': 'code', 'a.js.map': MAP_WITH_SOURCES } } })

    await uploadSourceMapsAfterBuild(configured, { distDir: '.next', projectDir: '.' })

    expect(uploadSourcemaps).toHaveBeenCalledTimes(1)
    expect(uploadSourcemaps.mock.calls[0][0]).toHaveLength(1)
  })

  it('skips a development build', async () => {
    process.env.NODE_ENV = 'development'
    mock({ '.next': { 'static': { 'a.js': 'code', 'a.js.map': MAP_WITH_SOURCES } } })

    await uploadSourceMapsAfterBuild(configured, { distDir: '.next', projectDir: '.' })

    expect(uploadSourcemaps).not.toHaveBeenCalled()
  })

  it('sends a deploy notification only when asked', async () => {
    process.env.NODE_ENV = 'production'
    mock({ '.next': { 'static': { 'a.js': 'code', 'a.js.map': MAP_WITH_SOURCES } } })

    await uploadSourceMapsAfterBuild(configured, { distDir: '.next', projectDir: '.' })
    expect(sendDeployNotification).not.toHaveBeenCalled()

    await uploadSourceMapsAfterBuild(
      { ...configured, deploy: { environment: 'production' } },
      { distDir: '.next', projectDir: '.' }
    )
    expect(sendDeployNotification).toHaveBeenCalledTimes(1)
  })

  describe('deleting the maps after upload', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
      mock({ '.next': { 'static': { 'a.js': 'code', 'a.js.map': MAP_WITH_SOURCES } } })
    })

    // We turn on productionBrowserSourceMaps to have something to upload, and that also
    // serves them. Deleting afterwards restores what hidden-source-map used to give us.
    it('removes them when asked', async () => {
      await uploadSourceMapsAfterBuild(configured, { distDir: '.next', projectDir: '.' }, {
        deleteBrowserSourcemaps: true,
      })

      expect(fs.existsSync('.next/static/a.js.map')).toBe(false)
      // the JavaScript itself is untouched
      expect(fs.existsSync('.next/static/a.js')).toBe(true)
    })

    it('leaves them when not asked', async () => {
      await uploadSourceMapsAfterBuild(configured, { distDir: '.next', projectDir: '.' })

      expect(fs.existsSync('.next/static/a.js.map')).toBe(true)
    })

    // Cleanup exists because we enabled `productionBrowserSourceMaps`, which serves what
    // it generates. A map we declined to upload is still served, so scoping deletion to
    // successful uploads would leak exactly the maps that failed the collection filters.
    it('removes browser maps that were never uploaded', async () => {
      mock({
        '.next': {
          'static': {
            'good.js': 'code', 'good.js.map': MAP_WITH_SOURCES,
            // rejected by collectSourcemaps: no sourcesContent
            'empty.js': 'code', 'empty.js.map': MAP_WITHOUT_SOURCES,
            // rejected by collectSourcemaps: unparseable
            'broken.js': 'code', 'broken.js.map': 'not json',
            // rejected by collectSourcemaps: no sibling .js
            'orphan.js.map': MAP_WITH_SOURCES,
            // rejected by ignorePaths below
            'vendor.js': 'code', 'vendor.js.map': MAP_WITH_SOURCES,
          },
        },
      })

      await uploadSourceMapsAfterBuild(
        {
          ...configured,
          ignorePaths: ['**/vendor.js'],
        },
        { distDir: '.next', projectDir: '.' },
        { deleteBrowserSourcemaps: true }
      )

      // Only `good.js.map` was uploadable...
      expect(uploadSourcemaps).toHaveBeenCalledTimes(1)
      expect(uploadSourcemaps.mock.calls[0][0].map((s: { jsFilename: string }) => s.jsFilename))
        .toEqual(['static/good.js'])
      // ...but every one of them is gone from the served output.
      expect(fs.readdirSync('.next/static').filter((f) => f.endsWith('.js.map'))).toEqual([])
    })

    // Failing to delete means a map this package caused to be served stays served, so it
    // must not hide behind the default `silent: true`.
    it('warns loudly, and does not fail the build, when a map cannot be deleted', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
      const unlink = jest.spyOn(fs.promises, 'unlink')
        .mockRejectedValue(Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' }))

      await expect(
        uploadSourceMapsAfterBuild(configured, { distDir: '.next', projectDir: '.' }, {
          deleteBrowserSourcemaps: true,
        })
      ).resolves.toBeUndefined()

      expect(warn).toHaveBeenCalledWith(
        '[HoneybadgerNextJs]',
        expect.stringContaining('will be served')
      )
      unlink.mockRestore()
      warn.mockRestore()
    })

    // `.next/server` is never served, so there is no exposure to undo — and Next.js reads
    // these maps itself to format server-side stack traces.
    it('never removes server maps, even when asked', async () => {
      mock({
        '.next': {
          'static': { 'a.js': 'code', 'a.js.map': MAP_WITH_SOURCES },
          'server': { 'b.js': 'code', 'b.js.map': MAP_WITH_SOURCES },
        },
      })

      await uploadSourceMapsAfterBuild(configured, { distDir: '.next', projectDir: '.' }, {
        deleteBrowserSourcemaps: true,
      })

      expect(fs.existsSync('.next/static/a.js.map')).toBe(false)
      expect(fs.existsSync('.next/server/b.js.map')).toBe(true)
    })

    // The maps are regenerated by the next build; a deploy that served them is not
    // recallable. So exposure wins over keeping "the only copy".
    it('removes them even when the upload failed', async () => {
      uploadSourcemaps.mockRejectedValue(new Error('honeybadger is down'))

      await expect(
        uploadSourceMapsAfterBuild(configured, { distDir: '.next', projectDir: '.' }, {
          deleteBrowserSourcemaps: true,
        })
      ).rejects.toThrow('honeybadger is down')

      expect(fs.existsSync('.next/static/a.js.map')).toBe(false)
    })

    // The dangerous combination: `ignoreErrors` is what the docs recommend so a Honeybadger
    // outage cannot block a deploy, which means a failed upload produces a *successful*
    // build. Skipping cleanup there would publish the source of every such build.
    it('removes them when a failed upload is ignored', async () => {
      const error = jest.spyOn(console, 'error').mockImplementation(() => undefined)
      uploadSourcemaps.mockRejectedValue(new Error('honeybadger is down'))

      await expect(
        uploadSourceMapsAfterBuild(
          { ...configured, ignoreErrors: true },
          { distDir: '.next', projectDir: '.' },
          { deleteBrowserSourcemaps: true }
        )
      ).resolves.toBeUndefined()

      expect(fs.existsSync('.next/static/a.js.map')).toBe(false)
      error.mockRestore()
    })

    // Collection runs before upload, so its failures take the same path.
    it('removes them when collection itself failed', async () => {
      const error = jest.spyOn(console, 'error').mockImplementation(() => undefined)
      const readdir = jest.spyOn(fs.promises, 'readdir')
      readdir.mockRejectedValueOnce(Object.assign(new Error('EACCES'), { code: 'EACCES' }))

      await expect(
        uploadSourceMapsAfterBuild(
          { ...configured, ignoreErrors: true },
          { distDir: '.next', projectDir: '.' },
          { deleteBrowserSourcemaps: true }
        )
      ).resolves.toBeUndefined()

      expect(fs.existsSync('.next/static/a.js.map')).toBe(false)
      readdir.mockRestore()
      error.mockRestore()
    })

    // A dev/test build never uploads, so it never enabled the maps either — leave the
    // developer's build output alone.
    it('leaves them alone in a development build', async () => {
      process.env.NODE_ENV = 'development'

      await uploadSourceMapsAfterBuild(configured, { distDir: '.next', projectDir: '.' }, {
        deleteBrowserSourcemaps: true,
      })

      expect(fs.existsSync('.next/static/a.js.map')).toBe(true)
    })

    // Cleanup must not replace the error the caller is about to see. Collection walks the
    // same directories as cleanup, so the failure has to start only once upload has run —
    // otherwise collection throws first and the scenario never happens.
    it('does not let a cleanup failure mask the upload failure', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
      const realReaddir = fs.promises.readdir
      let cleanupPhase = false

      uploadSourcemaps.mockImplementation(async () => {
        cleanupPhase = true
        throw new Error('honeybadger is down')
      })
      const readdir = jest.spyOn(fs.promises, 'readdir').mockImplementation(((...args: unknown[]) => {
        if (cleanupPhase) {
          return Promise.reject(Object.assign(new Error('EACCES'), { code: 'EACCES' }))
        }
        return (realReaddir as (...a: unknown[]) => unknown)(...args)
      }) as never)

      await expect(
        uploadSourceMapsAfterBuild(configured, { distDir: '.next', projectDir: '.' }, {
          deleteBrowserSourcemaps: true,
        })
      ).rejects.toThrow('honeybadger is down')

      expect(warn).toHaveBeenCalledWith(
        '[HoneybadgerNextJs]',
        expect.stringContaining('could not clean up browser source maps')
      )
      readdir.mockRestore()
      warn.mockRestore()
    })
  })

  // A configured upload that finds nothing looks identical to success in the build log,
  // which is how a moved distDir or an over-broad ignorePaths goes unnoticed.
  describe('when there is nothing to upload', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
    })

    it('warns instead of reporting a silent success', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
      mock({ '.next': { 'static': {} } })

      await uploadSourceMapsAfterBuild(configured, { distDir: '.next', projectDir: '.' })

      expect(uploadSourcemaps).not.toHaveBeenCalled()
      expect(warn).toHaveBeenCalledWith(
        '[HoneybadgerNextJs]',
        expect.stringContaining('found no source maps to upload')
      )
      warn.mockRestore()
    })

    // A directory that does not exist is normal: `.next/server` is absent unless
    // experimental.serverSourceMaps is on.
    it('treats a missing distDir as empty rather than an error', async () => {
      mock({})

      await expect(collectSourcemaps('.next')).resolves.toEqual([])
    })

    // Anything other than ENOENT would silently shrink the upload to whatever happened to
    // be readable, which is worse than failing.
    it('propagates a readdir failure that is not a missing directory', async () => {
      const readdir = jest.spyOn(fs.promises, 'readdir')
        .mockRejectedValue(Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' }))

      await expect(collectSourcemaps('.next')).rejects.toThrow('EACCES')

      readdir.mockRestore()
    })

    it('lets ignoreErrors govern that failure like any other', async () => {
      const error = jest.spyOn(console, 'error').mockImplementation(() => undefined)
      const readdir = jest.spyOn(fs.promises, 'readdir')
        .mockRejectedValue(Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' }))

      await expect(
        uploadSourceMapsAfterBuild(
          { ...configured, ignoreErrors: true },
          { distDir: '.next', projectDir: '.' }
        )
      ).resolves.toBeUndefined()

      readdir.mockRestore()
      error.mockRestore()
    })
  })

  describe('when the upload fails', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
      mock({ '.next': { 'static': { 'a.js': 'code', 'a.js.map': MAP_WITH_SOURCES } } })
      uploadSourcemaps.mockRejectedValue(new Error('honeybadger is down'))
    })

    it('fails the build by default, because Next re-throws this hook', async () => {
      await expect(
        uploadSourceMapsAfterBuild(configured, { distDir: '.next', projectDir: '.' })
      ).rejects.toThrow('honeybadger is down')
    })

    it('does not fail the build when ignoreErrors is set', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined)

      await expect(
        uploadSourceMapsAfterBuild(
          { ...configured, ignoreErrors: true },
          { distDir: '.next', projectDir: '.' }
        )
      ).resolves.toBeUndefined()

      expect(uploadSourcemaps).toHaveBeenCalled()
    })
  })
})

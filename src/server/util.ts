import os from 'os'
import fs from 'fs'

export function fatallyLogAndExit(err: Error): never {
  console.error('[Honeybadger] Exiting process due to uncaught exception')
  console.error(err.stack || err)
  process.exit(1)
}

export function getStats(cb: (stats: Record<string, unknown>) => void): void {
  const load = os.loadavg(),
    stats = {
      load: {
        one: load[0],
        five: load[1],
        fifteen: load[2]
      },
      mem: {}
    }

  if (fs.existsSync('/proc/meminfo')) {
    return fs.readFile('/proc/meminfo', 'utf8', parseStats)
  }
  fallback()

  function parseStats(err: Error, memData: string) {
    if (err) return fallback()

    // The first four lines, in order, are Total, Free, Buffers, Cached.
    // @TODO: Figure out if there's a way to only read these lines
    const data = memData.split('\n').slice(0, 4)

    const results = data.map(function (i: string) {
      return parseInt(/\s+(\d+)\skB/i.exec(i)[1], 10) / 1024.0
    })

    stats.mem = {
      total: results[0],
      free: results[1],
      buffers: results[2],
      cached: results[3],
      free_total: results[1] + results[2] + results[3]
    }
    return cb(stats)
  }

  function fallback() {
    stats.mem = {
      free: os.freemem(),
      total: os.totalmem()
    }
    return cb(stats)
  }
}

/**
 * Get source file if possible, used to build `notice.backtrace.source`
 *
 * @param path to source code
 * @param cb callback with fileContent
 */
export function getSourceFile(path: string, cb: (fileContent: string) => void): void {
  fs.readFile(path, 'utf-8', (err, data) => {
    cb(err ? null : data)
  })
}

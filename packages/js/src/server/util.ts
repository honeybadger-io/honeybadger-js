import os from 'os'
import fs from 'fs'
import path from 'path'
import { Types } from '@honeybadger-io/core'
import { promisify } from 'util'

const readFile = promisify(fs.readFile)

export function fatallyLogAndExitGracefully(signal: NodeJS.Signals): never {
  console.log(`[Honeybadger] Received ${signal}, exiting immediately`)
  process.exit()
}

export function fatallyLogAndExit(err: Error, source: string): never {
  console.error(`[Honeybadger] Exiting process due to ${source}`)
  console.error(err.stack || err)
  process.exit(1)
}

export async function getStats(): Promise<Types.ProcessStats> {
  const load = os.loadavg()
  const stats: Types.ProcessStats = {
    load: {
      one: load[0],
      five: load[1],
      fifteen: load[2]
    },
    mem: {}
  }

  const fallback = () => {
    stats.mem = {
      free: os.freemem(),
      total: os.totalmem()
    }
  }

  if (!fs.existsSync('/proc/meminfo')) {
    fallback()
    return stats
  }

  try {
    const memData = await readFile('/proc/meminfo', 'utf8')
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
  }
  catch (error) {
    fallback()
  }

  return stats
}

/**
 * Get source file if possible, used to build `notice.backtrace.source`
 *
 * @param path to source code
 */
export async function getSourceFile(path: string): Promise<string> {
  try{
    return await readFile(path, 'utf-8')
  }
  catch (_e) {
    return null;
  }
}

export function readConfigFromFileSystem(): Types.Config {
  const options = ['honeybadger.config.js', 'honeybadger.config.ts']
  let config = null
  while (config === null && options.length > 0) {
    const configPath = options.shift()
    try {
      config = require(path.join(process.cwd(), configPath))
    }
    catch (_e) { /* empty */ }
  }

  return config
}

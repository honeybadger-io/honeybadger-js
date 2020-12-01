export function fatallyLogAndExit(err: Error): void {
  console.error('[Honeybadger] Exiting process due to uncaught exception')
  console.error(err.stack || err)
  process.exit(1)
}
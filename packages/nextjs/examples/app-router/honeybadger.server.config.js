import Honeybadger from '@honeybadger-io/js'

const projectRoot = process.cwd()

export const config = {
  apiKey: process.env.NEXT_PUBLIC_HONEYBADGER_API_KEY,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV || process.env.NODE_ENV,
  revision: process.env.NEXT_PUBLIC_HONEYBADGER_REVISION,
  projectRoot: 'webpack:///./',
  debug: true,
  // reportData: true,
  insights: { enabled: true, http: true },
}

Honeybadger
  .configure(config)
  .beforeNotify((notice) => {
    notice.backtrace.forEach((line) => {
      if (line.file) {
        line.file = line.file.replace(`${projectRoot}/.next/server`, `${process.env.NEXT_PUBLIC_HONEYBADGER_ASSETS_URL}/..`)
      }
      return line
    })
  })
Honeybadger.logger.debug('Honeybadger configured for server')

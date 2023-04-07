import { Honeybadger } from '@honeybadger-io/react'

Honeybadger.configure({

  apiKey: process.env.NEXT_PUBLIC_HONEYBADGER_API_KEY,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV || process.env.NODE_ENV,
  revision: process.env.NEXT_PUBLIC_HONEYBADGER_REVISION,
  projectRoot: 'webpack://_N_E/./',
  // debug: true,
  // reportData: true,
})
Honeybadger.logger.debug('Honeybadger configured for edge')

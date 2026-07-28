import { withHoneybadger } from '@honeybadger-io/nextjs'
import { config } from '../../honeybadger.server.config'

// API routes are not covered by the webpack config-file injection (that only
// targets `pages/_app` / `pages/_document` / `pages/_error`), so Honeybadger
// must be configured explicitly here. Passing `config` reuses the same
// settings as `honeybadger.server.config.js` instead of duplicating them.
export default withHoneybadger((req, res) => {
  res.status(200).json({ message: 'hello from pages-router api route' })
}, config)

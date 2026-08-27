// No wrapper needed: `onRequestError` in instrumentation.ts reports errors thrown here.
// API routes used to need an explicit `withHoneybadger(handler, config)` because the
// webpack config-file injection never reached them.
export default function handler(req, res) {
  res.status(200).json({ message: 'hello from pages-router api route' })
}

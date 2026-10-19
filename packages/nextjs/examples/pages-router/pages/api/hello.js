// No wrapper needed: `onRequestError` in instrumentation.ts reports errors thrown here.
export default function handler(_req, res) {
  res.status(200).json({ message: 'hello from pages-router api route' })
}

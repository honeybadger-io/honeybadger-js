// The bundle Next.js resolves in its *edge compilation context* — the one it builds for
// middleware and for `instrumentation`. That context exists in every Next.js build, even
// with no middleware and no edge routes, and Node builtins are unavailable in it.
//
// This is not the deprecated `export const runtime = 'edge'` for route handlers, which this
// package no longer ships a config template or example for. It is why the `edge-light`
// exports condition has to stay: without it Next resolves this package to the browser
// bundle in that context, and the build fails with "Export captureRequestError doesn't
// exist".
//
// `setup` is deliberately excluded — next.config is evaluated on the Node side only, and it
// is what pulls in `fs`, `path` and the source map upload.
export * from './capture-request-error'
export * from './insights'

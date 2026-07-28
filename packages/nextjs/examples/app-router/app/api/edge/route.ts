import { NextResponse } from 'next/server'
import { withHoneybadger } from '@honeybadger-io/nextjs'
import { config } from '../../../honeybadger.edge.config'

export const runtime = 'edge'

// Importing `withHoneybadger` here must not pull in the Node-only webpack
// plugin (`fs`/`path`) - Next.js resolves the `edge-light` export condition
// to a separate, fs-free bundle for edge routes/middleware.
export const GET = withHoneybadger(async () => {
  return NextResponse.json({ message: 'hello from the edge' })
}, config)

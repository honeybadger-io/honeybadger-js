import { NextResponse } from 'next/server'

// No wrapper needed: `onRequestError` in instrumentation.ts reports errors thrown here.
// API routes used to need an explicit `withHoneybadger(handler, config)` because the
// webpack config-file injection never reached them.
export const GET = async () => {
  return NextResponse.json({ message: 'hello from app-router api route' })
}

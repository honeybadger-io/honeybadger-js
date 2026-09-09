import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// No wrapper needed: `onRequestError` in instrumentation.ts reports errors thrown here.
// API routes used to need an explicit `withHoneybadger(handler, config)` because the
// webpack config-file injection never reached them.
export const GET = async (request: NextRequest) => {
  if (request.nextUrl.searchParams.get('fail') === 'true') {
    throw new Error('thrown from an app-router route handler')
  }

  return NextResponse.json({ message: 'hello from app-router api route' })
}

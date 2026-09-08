import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Middleware runs before the request reaches a route, so an error boundary cannot catch it.
// `onRequestError` in instrumentation.ts reports it.
export function middleware(request: NextRequest) {
  throw new Error(`thrown in middleware for ${request.nextUrl.pathname}`)
}

export const config = {
  matcher: '/middleware-test',
}

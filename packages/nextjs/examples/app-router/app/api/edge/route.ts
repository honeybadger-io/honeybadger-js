import { NextResponse } from 'next/server'

export const runtime = 'edge'

// The edge runtime is instrumented by `register()` in instrumentation.ts, which imports
// honeybadger.edge.config when NEXT_RUNTIME === 'edge'. Errors are reported through
// `onRequestError`, so no per-handler wrapper is required.
export const GET = async () => {
  return NextResponse.json({ message: 'hello from the edge' })
}

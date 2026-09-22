// Browser bundle: only what `instrumentation-client` needs. Kept separate so a client
// bundle does not pull in the server hooks — `flush` imports `next/server` at the top
// level, which would otherwise ship NextRequest/NextResponse to every visitor.
export * from './capture-router-transition-start'

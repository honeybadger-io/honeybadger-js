'use client'

import Link from 'next/link'

const serverScenarios = [
  {
    href: '/counter?fail=true',
    title: 'Client Component render',
    detail: 'Throws while rendering. Caught by app/error.tsx, which calls Honeybadger.notify.',
  },
  {
    href: '/data-fetching?fail=true',
    title: 'Server Component data fetching',
    detail: 'Throws in an async Server Component. Reported by onRequestError in instrumentation.ts.',
  },
  {
    href: '/metadata-example?fail=true',
    title: 'generateMetadata',
    detail: 'Throws outside the component tree, where an error boundary cannot reach.',
  },
  {
    href: '/api/hello?fail=true',
    title: 'Route Handler',
    detail: 'API routes used to need an explicit wrapper; instrumentation covers them now.',
  },
  {
    href: '/middleware-test',
    title: 'Middleware',
    detail: 'Throws before the request reaches a route.',
  },
]

export default function Home() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Honeybadger + Next.js App Router</h1>
        <p className="text-sm opacity-70">
          Every link below throws on purpose. Each error should appear in your Honeybadger
          project. Nothing here wraps a handler by hand — the whole app is instrumented by{' '}
          <code className="font-mono">instrumentation.ts</code> and{' '}
          <code className="font-mono">instrumentation-client.ts</code>, which work under
          Turbopack and webpack alike.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">
          Browser
        </h2>
        <button
          className="w-fit rounded border px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
          onClick={() => {
            throw new Error('thrown from an onClick handler in app/page.tsx')
          }}
        >
          Throw in an event handler
        </button>
        <p className="text-sm opacity-70">
          Reported by the browser client. The backtrace should symbolicate back to{' '}
          <code className="font-mono">app/page.tsx</code> if source map upload is configured.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">
          Server and middleware
        </h2>
        <ul className="flex flex-col gap-3">
          {serverScenarios.map((scenario) => (
            <li key={scenario.href} className="flex flex-col gap-1">
              <Link className="text-sm underline underline-offset-4" href={scenario.href}>
                {scenario.title}
              </Link>
              <span className="text-sm opacity-70">{scenario.detail}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

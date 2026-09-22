'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'

function Counter() {
  const [count, setCount] = useState(0)
  const params = useSearchParams()

  // Thrown during render. Caught by app/error.tsx, which reports it with Honeybadger.notify.
  if (params.get('fail') === 'true') {
    throw new Error('will not render component - fail === true')
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <p>You clicked {count} times</p>
      <button
        className="w-fit rounded border px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
        onClick={() => setCount(count + 1)}
      >
        Click me
      </button>
    </div>
  )
}

// `useSearchParams` opts a client component out of static rendering, so Next.js requires a
// Suspense boundary around it — without one the production build fails to prerender.
export default function Page() {
  return (
    <main className="p-8">
      <Suspense fallback={<p>Loading…</p>}>
        <Counter />
      </Suspense>
    </main>
  )
}

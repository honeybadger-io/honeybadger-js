// `searchParams` is a Promise from Next.js 15 onwards, so it has to be awaited.
type Props = { searchParams: Promise<{ fail?: string }> }

/**
 * Stands in for a real data source. The example used to call a public placeholder API, which
 * made the page fail for reasons unrelated to Honeybadger whenever that service changed; the
 * mechanism being demonstrated is the throw, not the transport.
 */
async function getData(fail = false) {
  await new Promise((resolve) => setTimeout(resolve, 10))

  if (fail) {
    // Activates the closest error boundary — app/error.tsx — and is reported to Honeybadger
    // by `onRequestError` in instrumentation.ts, because this runs on the server.
    throw new Error('Failed to fetch data: upstream returned 500')
  }

  return { data: [{ id: 1 }, { id: 2 }, { id: 3 }] }
}

export default async function Page({ searchParams }: Props) {
  const { fail } = await searchParams
  const data = await getData(fail === 'true')

  return <div>Data Fetching Error Example: {data.data.length}</div>
}

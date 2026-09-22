import type { Metadata } from 'next'

// `searchParams` is a Promise from Next.js 15 onwards, so it has to be awaited.
type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { fail } = await searchParams

  // Thrown outside the component tree, where an error boundary cannot reach it.
  // `onRequestError` still reports it.
  if (fail === 'true') {
    throw new Error('failing on purpose')
  }

  return { title: 'Metadata Example - App Router' }
}

export default function MetadataExample() {
  return (
    <div>
      <p>A page with generateMetadata</p>
    </div>
  )
}

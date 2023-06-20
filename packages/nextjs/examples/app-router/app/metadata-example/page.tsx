import { Metadata } from 'next';

type Props = {
  params: { id: string }
  searchParams: { [key: string]: string | string[] | undefined }
}



export function generateMetadata({ searchParams }: Props): Metadata {

  if (searchParams.fail === 'true') {
    throw new Error('failing on purpose');
  }

  return {
    title: 'Metadata Example - App Router'
  }
}

export default function MetadataExample() {
  return (
    <div>
      <p>A page with generateMetadata</p>
    </div>
  );
}

import * as React from 'react';

export default function BuggyComponent() {
  const [hasError, setHasError] = React.useState(false)

  if (hasError) {
    throw Error('testing error boundary')
  }
  return (
    <div>
      <button onClick={() => setHasError(true)}>Click here to trigger an error</button>
    </div>
  )

}

import { useState } from 'react'

function BuggyComponent() {
  const [error, setError] = useState(false)

  function bug() {
      setError(true)
  }

  if (error) {
    throw Error('oops.')
  }

  return (
      <div>
        <button onClick={bug}>Click here to trigger an error</button>
      </div>
  )
}

export default BuggyComponent

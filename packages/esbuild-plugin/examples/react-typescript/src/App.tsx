import * as React from 'react'
import Panel from './Panel'
import BuggyComponent from './BuggyComponent';

// App Component
export default function App() {
  return (<div>
    <h1>Hello, ESBUILD!</h1>
    <Panel/>
    <BuggyComponent/>
    <Panel/>
  </div>)
}

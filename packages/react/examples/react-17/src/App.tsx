import React from 'react'
import BuggyComponent from './BuggyComponent'
import GoodComponent from './GoodComponent'

export default class App extends React.Component<Record<string, never>, Record<string, never>> {

  render() {
    return (
      <div>
        <GoodComponent/>
        <BuggyComponent/>
      </div>
    )
  }

}

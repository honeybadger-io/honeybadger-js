import React from 'react'
import BuggyComponent from "./BuggyComponent"
import GoodComponent from "./GoodComponent"

export default class App extends React.Component<{}, {}> {

  render() {
    return (
      <div>
        <GoodComponent/>
        <BuggyComponent/>
      </div>
    )
  }

}

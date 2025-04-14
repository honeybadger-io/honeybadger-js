import { Component } from 'react'

export default class BuggyComponent extends Component<Record<string, never>, { error: boolean }> {

  constructor(props: Record<string, never>) {
    super(props);
    this.bug = this.bug.bind(this)
    this.state = {
      error: false
    }
  }

  bug() {
    this.setState({
      error: true
    })
  }

  render () {
    if (this.state.error) {
      throw Error('oops.')
    }
    return (
      <div>
        <button onClick={this.bug}>Click here to trigger an error</button>
      </div>
    )
  }

}

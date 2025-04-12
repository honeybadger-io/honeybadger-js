import { Component } from 'react';

export default class GoodComponent extends Component<Record<string, never>, Record<string, never>> {

  render () {
    return (
      <div>
        <button>Click here to have nothing go wrong</button>
      </div>
    )
  }

}

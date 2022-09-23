import React, {Component} from "react"
import PropTypes from "prop-types";

export interface DefaultErrorComponentProps {
  error: Error | null
  info: React.ErrorInfo | null
}

export default class DefaultErrorComponent extends Component<DefaultErrorComponentProps, {}> {

  static propTypes = {
    error: PropTypes.object,
    info: PropTypes.object
  }

  render() {
    return (
      <div className='error'>
        <div>
          An Error Occurred
        </div>
        <div>
          {JSON.stringify(this.props.error, null, 2)}
        </div>
        <div>
          {this.props.info ? JSON.stringify(this.props.info, null, 2) : ''}
        </div>
      </div>
    )
  }
}

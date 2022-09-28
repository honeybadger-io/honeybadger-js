import React, { Component, ReactNode } from 'react'
import Honeybadger from '@honeybadger-io/js/dist/browser/honeybadger'
import DefaultErrorComponent, { DefaultErrorComponentProps } from './DefaultErrorComponent'
import PropTypes from 'prop-types';

interface HoneybadgerErrorBoundaryProps {
  honeybadger: typeof Honeybadger
  ErrorComponent?: ReactNode
}

interface HoneybadgerErrorBoundaryState extends DefaultErrorComponentProps {
  errorOccurred: boolean
}

export default class HoneybadgerErrorBoundary extends Component<HoneybadgerErrorBoundaryProps, HoneybadgerErrorBoundaryState> {

  static propTypes = {
    honeybadger: PropTypes.object.isRequired,
    children: PropTypes.element,
    ErrorComponent: PropTypes.oneOfType([PropTypes.element, PropTypes.func])
  }

  constructor(props: HoneybadgerErrorBoundaryProps) {
    super(props)
    this.state = {
      error: null,
      info: null,
      errorOccurred: false
    }
  }

  public static getDerivedStateFromError(error: Error): HoneybadgerErrorBoundaryState {
    return { error: error, errorOccurred: true, info: null }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorOccurred: true, error: error, info: errorInfo })
    this.props.honeybadger.notify(error, { context: errorInfo as never })
  }

  private getErrorComponent(): ReactNode {
    return this.props.ErrorComponent
      ? React.createElement(this.props.ErrorComponent as never, this.state)
      : <DefaultErrorComponent {...this.state} />
  }

  render() {
    return (
      <>
        {this.state.errorOccurred
          ? this.getErrorComponent()
          : this.props.children
        }
      </>
    )
  }
}

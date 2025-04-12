import React, { Component, ReactNode } from 'react'
import DefaultErrorComponent from './DefaultErrorComponent'
import { HoneybadgerErrorBoundaryProps, HoneybadgerErrorBoundaryState } from './types'

export default class HoneybadgerErrorBoundary extends Component<HoneybadgerErrorBoundaryProps, HoneybadgerErrorBoundaryState> {

  static defaultProps = {
    showUserFeedbackFormOnError: false
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

  componentDidMount() {
    this.props.honeybadger.afterNotify((error, _notice) => {
      if (!error && this.props.showUserFeedbackFormOnError) {
        this.props.honeybadger.showUserFeedbackForm()
      }
    })
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, info: errorInfo })
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

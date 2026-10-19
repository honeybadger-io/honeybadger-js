import NextErrorComponent from 'next/error'
import Honeybadger from '@honeybadger-io/js'
/**
 * This component is called when:
 *  - on the server, when data fetching methods throw or reject
 *  - on the client, when getInitialProps throws or rejects
 *  - on the client, when a React lifecycle method (render, componentDidMount, etc) throws or rejects
 *      and was caught by the built-in Next.js error boundary
 */
const CustomErrorComponent = props => {
  return <NextErrorComponent statusCode={props.statusCode} />
}

CustomErrorComponent.getInitialProps = async contextData => {
  const { req, res, err } = contextData

  // Server-side errors are already reported by `onRequestError` in instrumentation, which
  // also covers API routes and middleware that this component never sees. Reporting them
  // here too would duplicate every one, so this only handles the client, where that hook
  // does not run and nothing else catches a failing `getInitialProps`.
  const onServer = Boolean(req)

  // exclude 40x except when this component is rendered from a routing error or a custom server
  // https://nextjs.org/docs/advanced-features/custom-error-page#caveats
  const statusCode = (res && res.statusCode) || contextData.statusCode

  if (onServer || (statusCode && statusCode < 500)) {
    Honeybadger.config.logger.debug(
      `_error.js skipping: onServer=${onServer} statusCode=${statusCode}`
    )
  }
  else {
    await Honeybadger.notifyAsync(err || `_error.js called with falsy error (${err})`, {
      context: { statusCode }
    })
  }

  return NextErrorComponent.getInitialProps(contextData)
}

export default CustomErrorComponent

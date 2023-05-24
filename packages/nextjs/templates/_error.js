import NextErrorComponent from 'next/error'
import { Honeybadger } from '@honeybadger-io/react'
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

  // exclude 40x except when this component is rendered from a routing error or a custom server
  // https://nextjs.org/docs/advanced-features/custom-error-page#caveats
  const statusCode = (res && res.statusCode) || contextData.statusCode;
  if (statusCode && statusCode < 500) {
    Honeybadger.config.logger.debug(`_error.js skipping because statusCode is ${statusCode}: ${req && req.url}`)
  }
  else {
    await Honeybadger.notifyAsync(err || `_error.js called with falsy error (${err})`, {
      context:
              {
                url: req.url,
                method: req.method,
                statusCode: res.statusCode,
              }
    })
  }

  return NextErrorComponent.getInitialProps(contextData)
}

export default CustomErrorComponent

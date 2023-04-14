// eslint-disable-next-line import/no-unresolved
import { notifyFromNextErrorComponent } from '@honeybadger-io/nextjs';
import NextErrorComponent from 'next/error';

/**
 * This component is called when:
 *  - on the server, when data fetching methods throw or reject
 *  - on the client, when getInitialProps throws or rejects
 *  - on the client, when a React lifecycle method (render, componentDidMount, etc) throws or rejects
 *      and was caught by the built-in Next.js error boundary
 */
const CustomErrorComponent = props => {
  return <NextErrorComponent statusCode={props.statusCode} />;
};

CustomErrorComponent.getInitialProps = async contextData => {
  await notifyFromNextErrorComponent(contextData);

  return NextErrorComponent.getInitialProps(contextData);
};

export default CustomErrorComponent;

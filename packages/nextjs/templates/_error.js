// eslint-disable-next-line import/no-unresolved
import { notifyFromNextErrorComponent } from '@honeybadger-io/nextjs';
import NextErrorComponent from 'next/error';

const CustomErrorComponent = props => {
  return <NextErrorComponent statusCode={props.statusCode} />;
};

CustomErrorComponent.getInitialProps = async contextData => {
  await notifyFromNextErrorComponent(contextData);

  return NextErrorComponent.getInitialProps(contextData);
};

export default CustomErrorComponent;

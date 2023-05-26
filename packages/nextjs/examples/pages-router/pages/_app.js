import React from 'react'
import { Honeybadger, HoneybadgerErrorBoundary } from '@honeybadger-io/react'

export default function App({ Component, pageProps }) {
  return (
      <HoneybadgerErrorBoundary honeybadger={Honeybadger}>
        <Component {...pageProps} />
      </HoneybadgerErrorBoundary>
  );
}

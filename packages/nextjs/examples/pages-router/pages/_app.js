import React from 'react'
// The singleton comes from @honeybadger-io/js, the package listed in
// `serverExternalPackages`, so this is the same instance the config files configure.
// @honeybadger-io/react is imported only for the boundary component itself.
import Honeybadger from '@honeybadger-io/js'
import { HoneybadgerErrorBoundary } from '@honeybadger-io/react'

export default function App({ Component, pageProps }) {
  return (
    <HoneybadgerErrorBoundary honeybadger={Honeybadger}>
      <Component {...pageProps} />
    </HoneybadgerErrorBoundary>
  );
}

import Honeybadger from '@honeybadger-io/js'
import HoneybadgerErrorBoundary from './HoneybadgerErrorBoundary'

const NOTIFIER = {
  name: '@honeybadger-io/react',
  url: 'https://github.com/honeybadger-io/honeybadger-js/tree/master/packages/react',
  version: '__VERSION__'
}

Honeybadger.setNotifier(NOTIFIER)

export {
  Honeybadger,
  HoneybadgerErrorBoundary
}

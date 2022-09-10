// Type definitions for honeybadger.js vue integration
// Project: https://github.com/honeybadger-io/honeybadger-vue

import { App } from 'vue'
import Honeybadger, { Types } from '@honeybadger-io/js/dist/browser/honeybadger'

declare module '@vue/runtime-core' {
  interface App {
    $honeybadger: typeof Honeybadger
  }
}

declare const HoneybadgerVue: {
  install(app: App, options?: Partial<Types.BrowserConfig>): void
}

export default HoneybadgerVue

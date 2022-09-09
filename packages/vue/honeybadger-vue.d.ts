// Type definitions for honeybadger.js vue integration
// Project: https://github.com/honeybadger-io/honeybadger-vue

import { App } from 'vue';
import Honeybadger from '@honeybadger-io/js/dist/browser/honeybadger'
import { BrowserConfig } from '@honeybadger-io/js/dist/browser/types/core/types'

declare module '@vue/runtime-core' {
  interface App {
    $honeybadger: typeof Honeybadger
  }
}

declare var HoneybadgerVue: {
  install(app: App, options?: Partial<BrowserConfig>): void
}

export default HoneybadgerVue

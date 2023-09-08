// When updating the minimum versions we test against in this file,
// please also update the docs:
//   https://github.com/honeybadger-io/docs/blob/master/source/lib/javascript/reference/supported-versions.html.md

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { devices } from '@playwright/test';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { getCdpEndpoint } from './browserstack.config';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const browserStackBrowsers = [
  {
    // Chrome minimum version
    // Earliest available chrome version is 83
    // https://www.browserstack.com/docs/automate/playwright/browsers-and-os
    name: 'browserstack_chrome_83_windows',
    use: {
      connectOptions: { wsEndpoint: getCdpEndpoint('chrome@83:Windows 10','browserstack_chrome_83_windows') },
    },
  },
  {
    // Chrome latest version
    name: 'browserstack_chrome_latest_windows',
    use: {
      connectOptions: { wsEndpoint: getCdpEndpoint('chrome@latest:Windows 11','browserstack_chrome_latest_windows') },
    },
  },
  {
    // Edge minimum version
    // Earliest available chrome version is 83
    // https://www.browserstack.com/docs/automate/playwright/browsers-and-os
    name: 'browserstack_edge_83_windows',
    use: {
      connectOptions: { wsEndpoint: getCdpEndpoint('edge@83:Windows 10','browserstack_edge_83_windows') },
    },
  },
  {
    // Edge latest version
    name: 'browserstack_edge_latest_windows',
    use: {
      connectOptions: { wsEndpoint: getCdpEndpoint('edge@latest:Windows 11','browserstack_edge_latest_windows') },
    },
  },
]

const playwrightBrowsers = [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
  {
    name: 'firefox',
    use: { ...devices['Desktop Firefox'] },
  },
  {
    name: 'webkit',
    use: { ...devices['Desktop Safari'] },
  },

  /* Test against mobile viewports. */
  {
    name: 'Mobile Chrome',
    use: { ...devices['Pixel 5'] },
  },
  {
    name: 'Mobile Safari',
    use: { ...devices['iPhone 12'] },
  },

  /* Test against branded browsers. */
  {
    name: 'Microsoft Edge',
    use: { ...devices['Desktop Edge'], channel: 'msedge' },
  },
  {
    name: 'Google Chrome',
    use: { ...devices['Desktop Chrome'], channel: 'chrome' },
  },
]

export const browsers = (!!process.env.CI || !!process.env.BROWSERSTACK_ACCESS_KEY)
  ? [...browserStackBrowsers, ...playwrightBrowsers]
  : playwrightBrowsers

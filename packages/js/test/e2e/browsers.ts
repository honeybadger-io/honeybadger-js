// When updating the minimum versions we test against in this file,
// please also update the docs:
//   https://github.com/honeybadger-io/docs/blob/master/source/lib/javascript/reference/supported-versions.html.md

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { devices } from '@playwright/test';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { getCdpEndpoint } from './browserstack.config';

export const browsers = [
  // {
  //   // Chrome minimum version
  //   name: 'browserstack_chrome_83_windows',
  //   use: {
  //     connectOptions: { wsEndpoint: getCdpEndpoint('chrome@83:Windows 10','browserstack_chrome_49_windows') },
  //   },
  // },
  // {
  //   // Chrome latest version
  //   name: 'browserstack_chrome_latest_windows',
  //   use: {
  //     connectOptions: { wsEndpoint: getCdpEndpoint('chrome@latest:Windows 11','browserstack_chrome_latest_windows') },
  //   },
  // },
  // {
  //   // Safari minimum version
  //   base: 'BrowserStack',
  //   browser: 'Safari',
  //   browser_version: '12.1',
  //   os: 'OS X',
  //   os_version: 'Mojave'
  // },
  // {
  //   // Safari latest version
  //   base: 'BrowserStack',
  //   browser: 'Safari',
  //   browser_version: 'latest',
  //   os: 'OS X',
  //   os_version: 'Ventura'
  // },
  // {
  //   // Firefox minimum version
  //   base: 'BrowserStack',
  //   browser: 'Firefox',
  //   browser_version: '58',
  //   os: 'Windows',
  //   os_version: '10'
  // },
  // {
  //   // Firefox latest version
  //   base: 'BrowserStack',
  //   browser: 'Firefox',
  //   browser_version: 'latest',
  //   os: 'Windows',
  //   os_version: '10'
  // },
  // {
  //   // Edge minimum version
  //   base: 'BrowserStack',
  //   browser: 'Edge',
  //   browser_version: '15',
  //   os: 'Windows',
  //   os_version: '10'
  // },
  // {
  //   // Edge latest version
  //   base: 'BrowserStack',
  //   browser: 'Edge',
  //   browser_version: 'latest',
  //   os: 'Windows',
  //   os_version: '11'
  // },

  // Uncomment below to test with playwright's bundled browsers
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
  // {
  //   name: 'firefox',
  //   use: { ...devices['Desktop Firefox'] },
  // },
  // {
  //   name: 'webkit',
  //   use: { ...devices['Desktop Safari'] },
  // },

  /* Test against mobile viewports. */
  // {
  //   name: 'Mobile Chrome',
  //   use: { ...devices['Pixel 5'] },
  // },
  // {
  //   name: 'Mobile Safari',
  //   use: { ...devices['iPhone 12'] },
  // },

  /* Test against branded browsers. */
  // {
  //   name: 'Microsoft Edge',
  //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
  // },
  // {
  //   name: 'Google Chrome',
  //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
  // },
]

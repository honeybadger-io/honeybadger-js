// This file is a modified version of the file from the Playwright BrowserStack Typescript example:
// https://github.com/browserstack/typescript-playwright-browserstack/blob/main/browserstack.config.ts#L41C8-L41C8

import * as cp from 'child_process'
import * as BrowserStackLocal from 'browserstack-local'

const clientPlaywrightVersion = cp
  .execSync('npx playwright --version')
  .toString()
  .trim()
  .split(' ')[1]

export const bsLocal = new BrowserStackLocal.Local()

export const BS_LOCAL_ARGS = {
  key: process.env.BROWSERSTACK_ACCESS_KEY,
}

// BrowserStack Specific Capabilities.
const defaultCapabilities = {
  browser: 'chrome',
  browser_version: 'latest',
  os: 'osx',
  os_version: 'catalina',
  name: 'Honeybadger Integration Tests',
  build: 'honeybadger-playwright-browserstack',
  'browserstack.username': process.env.BROWSERSTACK_USERNAME,
  'browserstack.accessKey': process.env.BROWSERSTACK_ACCESS_KEY,
  'browserstack.local': true, // we are running a local web server, so we need this to be true
  'browserstack.networkLogs': true,
  'browserstack.debug': true, // visual logs
  'browserstack.console': 'verbose', // console logs
  'client.playwrightVersion': clientPlaywrightVersion,
}

type OverridableCapabilities =
    Pick<typeof defaultCapabilities, 'browser' | 'browser_version' | 'os' | 'os_version' | 'name'>

export function getCdpEndpoint(capabilities: OverridableCapabilities){
  const merged = { ...defaultCapabilities, ...capabilities }

  return `wss://cdp.browserstack.com/playwright?caps=${encodeURIComponent(JSON.stringify(merged))}`
}

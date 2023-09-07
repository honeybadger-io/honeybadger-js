import * as cp from 'child_process'
import * as BrowserStackLocal from 'browserstack-local'

const clientPlaywrightVersion = cp
  .execSync('npx playwright --version')
  .toString()
  .trim()
  .split(' ')[1]

export const bsLocal = new BrowserStackLocal.Local()

// replace YOUR_ACCESS_KEY with your key. You can also set an environment variable - "BROWSERSTACK_ACCESS_KEY".
export const BS_LOCAL_ARGS = {
  key: process.env.BROWSERSTACK_ACCESS_KEY,
}

// BrowserStack Specific Capabilities.
// Set 'browserstack.local:true For Local testing
const caps = {
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
  'client.playwrightVersion': clientPlaywrightVersion,
}

// Patching the capabilities dynamically according to the project name.
const patchCaps = (name: string, title: string) => {
  const combination = name.split(/@browserstack/)[0]
  const [browserCaps, osCaps] = combination.split(/:/)
  const [browser, browser_version] = browserCaps.split(/@/)
  const osCapsSplit = osCaps.split(/ /)
  const os = osCapsSplit.shift()
  const os_version = osCapsSplit.join(' ')
  caps.browser = browser ? browser : 'chrome'
  caps.browser_version = browser_version ? browser_version : 'latest'
  caps.os = os ? os : 'osx'
  caps.os_version = os_version ? os_version : 'catalina'
  caps.name = title
}

export function getCdpEndpoint(name: string, title: string){
  patchCaps(name, title)
  return `wss://cdp.browserstack.com/playwright?caps=${encodeURIComponent(JSON.stringify(caps))}`
  // console.log(`--> ${cdpUrl}`)
}

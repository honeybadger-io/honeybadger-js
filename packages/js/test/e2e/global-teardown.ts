// This file is a modified version of the example on github:
// https://github.com/browserstack/node-js-playwright-browserstack/blob/main/global-setup.js

import { bsLocal } from './browserstack.config'

let bsLocalStopped = false
const stopBsLocal = async () => {
  return new Promise(resolve => {
    if (bsLocalStopped) {
      return resolve()
    }

    if (bsLocal && bsLocal.isRunning()) {
      bsLocal.stop(() => {
        bsLocalStopped = true
        console.log('Stopped BrowserStackLocal')
        resolve()
      });
    }
  })
}

module.exports = async () => {
  await stopBsLocal()
}

process.on('SIGINT', function() {
  stopBsLocal()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error stopping BrowserStackLocal', err)
      process.exit(1)
    })
});

// This file is a modified version of the example on github:
// https://github.com/browserstack/node-js-playwright-browserstack/blob/main/global-setup.js

import { bsLocal } from './browserstack.config'

let bsLocalStopped = false
const stopBsLocal = () => {
  return new Promise<void>(resolve => {
    if (bsLocalStopped) {
      return resolve()
    }

    if (bsLocal) {
      if (bsLocal.isRunning()) {
        bsLocal.stop(() => {
          bsLocalStopped = true
          console.log('Stopped BrowserStackLocal')
          resolve()
        });
      }
      else resolve()
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

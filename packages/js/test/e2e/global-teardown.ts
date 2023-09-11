import { bsLocal } from './browserstack.config'
import { promisify } from 'util'

let bsLocalStopped = false
const stopBsLocal = async () => {
  if (bsLocalStopped) {
    return
  }

  if (bsLocal && bsLocal.isRunning()) {
    bsLocal.stop(() => {
      bsLocalStopped = true
      console.log('Stopped BrowserStackLocal')
    });
    while (!bsLocalStopped) {
      await sleep(1000)
    }
  }
}

const sleep = promisify(setTimeout)
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

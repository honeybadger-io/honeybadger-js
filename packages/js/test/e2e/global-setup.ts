import { bsLocal, BS_LOCAL_ARGS } from './browserstack.config'

const redColour = '\x1b[31m'
const whiteColour = '\x1b[0m'
module.exports = () => {
  return new Promise<void>(resolve => {
    if (!process.env.BROWSERSTACK_ACCESS_KEY) {
      console.log('Will not start BrowserStackLocal because BROWSERSTACK_ACCESS_KEY is not set')

      return resolve()
    }

    console.log('Starting BrowserStackLocal ...');
    // Starts the Local instance with the required arguments
    bsLocal.start(BS_LOCAL_ARGS, (err) => {
      if (err) {
        console.error(
          `${redColour}Error starting BrowserStackLocal${whiteColour}: ${err}`
        )
      } else {
        console.log('BrowserStackLocal Started')
      }
      resolve()
    });
  })
}

import { Types } from '@honeybadger-io/core'
import { fatallyLogAndExit } from '../util'
import Client from '../../server'
import { removeAwsDefaultUncaughtExceptionListener } from '../aws_lambda'

let isReporting = false
let count = 0

function removeAwsLambdaListener() {
  const isLambda = !!process.env.LAMBDA_TASK_ROOT
  if (!isLambda) {
    return
  }

  removeAwsDefaultUncaughtExceptionListener()
}

/**
 * If there are no other uncaughtException listeners,
 * we want to report the exception to Honeybadger and
 * mimic the default behavior of NodeJs,
 * which is to exit the process with code 1
 */
function hasUncaughtExceptionListeners() {
  return process.listeners('uncaughtException').length !== 0
}

export default function (): Types.Plugin {
  return {
    load: (client: typeof Client) => {
      if (!client.config.enableUncaught) {
        return
      }

      removeAwsLambdaListener()

      const hasOtherListeners = hasUncaughtExceptionListeners();
      process.on('uncaughtException', function honeybadgerUncaughtExceptionListener(uncaughtError) {
        if (!client.config.enableUncaught) {
          client.config.afterUncaught(uncaughtError)
          if (!hasOtherListeners) {
            fatallyLogAndExit(uncaughtError)
          }
          return
        }

        // report only the first error - prevent reporting recursive errors
        if (count < 1) {
          isReporting = true
          client.notify(uncaughtError, {
            afterNotify: (_err, _notice) => {
              isReporting = false
              count++
              client.config.afterUncaught(uncaughtError)
              if (!hasOtherListeners) {
                fatallyLogAndExit(uncaughtError)
              }
            }
          })
        }
        else {
          if (!hasOtherListeners && !isReporting) {
            fatallyLogAndExit(uncaughtError)
          }
        }
      })
    }
  }
}

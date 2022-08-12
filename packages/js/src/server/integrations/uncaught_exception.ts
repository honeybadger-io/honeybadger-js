import { Types } from '@honeybadger-io/core'
import { fatallyLogAndExit } from '../util'
import Client from '../../server'
import { removeAwsDefaultUncaughtExceptionListener } from '../aws_lambda'

let count = 0

function removeAwsLambdaListener() {
  const isLambda = !!process.env.LAMBDA_TASK_ROOT
  if (!isLambda) {
    return
  }

  removeAwsDefaultUncaughtExceptionListener()
}

export default function (): Types.Plugin {
  return {
    load: (client: typeof Client) => {
      if (!client.config.enableUncaught) { return }

      removeAwsLambdaListener()

      process.on('uncaughtException', function honeybadgerUncaughtExceptionListener(uncaughtError) {
        // Prevent recursive errors
        if (count > 1) { fatallyLogAndExit(uncaughtError) }

        if (client.config.enableUncaught) {
          client.notify(uncaughtError, {
            afterNotify: (_err, _notice) => {
              count += 1
              client.config.afterUncaught(uncaughtError)
            }
          })
        } else {
          count += 1
          client.config.afterUncaught(uncaughtError)
        }
      })
    }
  }
}

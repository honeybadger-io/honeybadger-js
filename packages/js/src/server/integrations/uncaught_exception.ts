import { Types } from '@honeybadger-io/core'
import { fatallyLogAndExit } from '../util'
import Client from '../../server'
import { removeAwsDefaultUncaughtExceptionListener } from '../aws_lambda'

let isReporting = false
let handlerAlreadyCalled = false

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
function hasOtherUncaughtExceptionListeners() {
  return process.listeners('uncaughtException').length > 1
}

export function handleUncaughtException(uncaughtError: Error, client: typeof Client) {
  if (isReporting) { 
    return 
  }

  // In the "load" function in the exported plugin below, we 
  // never attach this listener if enableUncaught is false...
  // so why do we need this?
  if (!client.config.enableUncaught) {
    client.config.afterUncaught(uncaughtError)
    if (!hasOtherUncaughtExceptionListeners()) {
      fatallyLogAndExit(uncaughtError)
    }
    return
  }

  // report only the first error - prevent reporting recursive errors
  if (handlerAlreadyCalled) {
    if (!hasOtherUncaughtExceptionListeners()) {
      fatallyLogAndExit(uncaughtError)
    }
    return
  }

  setIsReporting(true)
  client.notify(uncaughtError, {
    afterNotify: (_err, _notice) => {
      setIsReporting(false)
      setHandlerAlreadyCalled(true)
      client.config.afterUncaught(uncaughtError)
      if (!hasOtherUncaughtExceptionListeners()) {
        fatallyLogAndExit(uncaughtError)
      }
    }
  })
}

export default function (): Types.Plugin {
  return {
    load: (client: typeof Client) => {
      if (!client.config.enableUncaught) {
        return
      }
      removeAwsLambdaListener()
      process.on('uncaughtException', function honeybadgerUncaughtExceptionListener(uncaughtError) {
        handleUncaughtException(uncaughtError, client)
      })
    }
  }
}

export function setIsReporting(bool: boolean) { 
  isReporting = bool 
} 

export function setHandlerAlreadyCalled(bool: boolean) { 
  handlerAlreadyCalled = bool 
}


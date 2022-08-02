import { Types } from '@honeybadger-io/core'
import Client from '../../server'

export default function (): Types.Plugin {
  return {
    load: (client: typeof Client) => {
      if (!client.config.enableUnhandledRejection) { return }

      process.on('unhandledRejection', function (reason, _promise) {
        if (!client.config.enableUnhandledRejection) { return }
        client.notify(reason as Types.Noticeable, { component: 'unhandledRejection' })
      })
    }
  }
}

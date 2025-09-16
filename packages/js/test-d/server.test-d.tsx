import { Defaults } from '@honeybadger-io/core'
import Honeybadger, { CheckInsClient, CheckIn, ServerTransport } from '../dist/server/honeybadger'

Honeybadger.configure({
  debug: false,
  reportData: false,
  endpoint: 'https://api.honeybadger.io',
  projectRoot: 'webpack:///./',
  apiKey: 'project api key',
  environment: 'production',
  hostname: 'badger01',
  revision: 'git SHA/project version',
  component: 'example_comonent',
  action: 'example_action',
  breadcrumbsEnabled: true
})

Honeybadger.resetContext({
  user_id: 123
})
Honeybadger.notify('test')
Honeybadger.notify(new Error('test'))
Honeybadger.notify({ message: 'test' })

Honeybadger.notify('Example message', {
  details: {
    'Section Name': {
      'Key': 'Value'
    }
  }
})

const client = Honeybadger.factory()
client.setContext({ a: 2 }).notify({ message: 'test' })
client.resetContext()
client.addBreadcrumb('testing')
client.notify(new Error('test'))
client.clear()

const client2 = Honeybadger.factory()
client2.beforeNotify(() => {
  console.log('Notifying')
})
client2.notify('test');

(async function () {
  const checkInsClient = new CheckInsClient({
    apiKey: 'project api key',
    appEndpoint: Defaults.CONFIG.appEndpoint,
    personalAuthToken: 'personal auth token',
    logger: console
  }, new ServerTransport())

  await checkInsClient.get('project id', 'check-in id')

  await checkInsClient.create('project id', new CheckIn({
    name: 'a simple check-in',
    slug: 'simple-check-in',
    scheduleType: 'simple',
    reportPeriod: '1 day',
    gracePeriod: '5 minutes',
  }))

  await checkInsClient.create('project id', new CheckIn({
    name: 'a cron check-in',
    slug: 'cron-check-in',
    scheduleType: 'cron',
    cronSchedule: '* * * * 5',
    cronTimezone: 'UTC',
    gracePeriod: '5 minutes',
  }))
})()


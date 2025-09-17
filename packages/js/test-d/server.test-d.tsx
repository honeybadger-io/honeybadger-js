import { Defaults } from '@honeybadger-io/core'
import Honeybadger from '../dist/server/honeybadger'

Honeybadger.configure({
  debug: false,
  reportData: false,
  endpoint: 'https://api.honeybadger.io',
  projectRoot: 'webpack:///./',
  apiKey: 'project api key',
  appEndpoint: Defaults.CONFIG.appEndpoint,
  personalAuthToken: 'personal auth token',
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

  // check-in with an id
  await Honeybadger.checkIn('check-in id')
  // check-in with a slug
  await Honeybadger.checkIn('check-in-slug')

  await Honeybadger.checkInsApi.listForProject('project id')

  await Honeybadger.checkInsApi.get('project id', 'check-in id')

  // name is optional, slug is required
  await Honeybadger.checkInsApi.create('project id', {
    name: 'a simple check-in',
    slug: 'simple-check-in',
    scheduleType: 'simple',
    reportPeriod: '1 day',
    gracePeriod: '5 minutes',
  })

  // name is optional, slug is required
  await Honeybadger.checkInsApi.create('project id', {
    name: 'a cron check-in',
    slug: 'cron-check-in',
    scheduleType: 'cron',
    cronSchedule: '* * * * 5',
    cronTimezone: 'UTC',
    gracePeriod: '5 minutes',
  })

  // slug is used to identify the check-in
  await Honeybadger.checkInsApi.update('project id', {
    name: 'a simple check-in',
    slug: 'simple-check-in',
    scheduleType: 'simple',
    reportPeriod: '1 day',
    gracePeriod: '15 minutes',
  })

  // need id to remove a check-in
  await Honeybadger.checkInsApi.remove('project id', {
    id: 'check-in id',
    name: 'a simple check-in',
    slug: 'simple-check-in',
    scheduleType: 'simple',
    reportPeriod: '1 day',
    gracePeriod: '15 minutes',
  })
})()


import Honeybadger from '../dist/browser/honeybadger'

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
  async: true,
  maxErrors: 20,
  breadcrumbsEnabled: true
})

Honeybadger.configure({
  breadcrumbsEnabled: {
    dom: false
  }
})

Honeybadger.configure({
  breadcrumbsEnabled: {
    dom: true,
    network: true,
    navigation: true,
    console: true
  }
})

Honeybadger.setContext({
  user_id: 123
})

Honeybadger.resetContext()

Honeybadger.resetContext({
  user_id: 123
})

Honeybadger.beforeNotify((notice) => {
  if (/third-party-domain/.test(notice.stack)) { return false }
})

Honeybadger.afterNotify((err, notice: { id }) => {
  if (err) { return console.log(`Honeybadger notification failed: ${err}`) }
  console.log(`Honeybadger notice: https://app.honeybadger.io/notice/${notice.id}`)
})

Honeybadger.addBreadcrumb('Test event', {
  category: 'custom',
  metadata: { user_id: 1, foo: 'bar' }
})

Honeybadger.beforeNotify(function(notice){
  notice.stack
  notice.name = 'ExampleError'
  notice.message = 'Example message'
  notice.url = 'https://www.example.com/'
  notice.projectRoot = 'https://www.example.com/'
  notice.environment = 'production'
  notice.revision = 'git SHA/project version'
  notice.component = 'example_comonent'
  notice.action = 'example_action'
  notice.fingerprint = 'fingerprint'
  notice.context = { user_id: 1 }
  notice.params = {}
  notice.cookies = 'foo=bar'
  notice.cookies = { foo: 'bar' }
})

Honeybadger.notify(new Error('Example message'))
Honeybadger.notify(new Error('Example message'), 'ExampleError')
Honeybadger.notify(new Error('Example message'), { component: 'example_component' })
Honeybadger.notify(new Error('Example message'), 'ExampleError', {
  component: 'example_component'
})

Honeybadger.notify('Example message')
Honeybadger.notify('Example message', 'ExampleError')
Honeybadger.notify('Example message', { component: 'example_component' })
Honeybadger.notify('Example message', 'ExampleError', {
  component: 'example_component'
})

Honeybadger.notify({ message: 'Example message', name: 'ExampleError' })

Honeybadger.notify('Example message', {
  afterNotify: (err, notice) => console.log(err || notice.id)
})

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

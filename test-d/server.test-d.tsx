import Honeybadger from '../dist/server/honeybadger'

Honeybadger.configure({
    debug: false,
    disabled: true,
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

const client = Honeybadger.factory()
client.setContext({a: 2}).notify({ message: 'test' })
client.resetContext()
client.addBreadcrumb("testing")
client.notify(new Error('test'))
client.clear()

const client2 = Honeybadger.factory()
client2.beforeNotify(() => {
    console.log("Notifying")
})
client2.notify('test')

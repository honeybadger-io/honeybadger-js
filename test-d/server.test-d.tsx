import Honeybadger from '../dist/server/honeybadger'

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

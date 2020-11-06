import Honeybadger from '../dist/server/honeybadger'

Honeybadger.notify('test')
Honeybadger.notify(new Error('test'))
Honeybadger.notify({ message: 'test' })

Honeybadger.factory()
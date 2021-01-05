import { nullLogger, TestClient } from '../helpers'

class MyError extends Error {
  context = null
  component = null

  sayHello() {
    return "hello " + this.message;
  }
  constructor(m: string) {
    super(m);
  }
}

describe('client', function () {
  let client

  beforeEach(function () {
    client = new TestClient({
      logger: nullLogger(),
      environment: null
    })
  })

  describe('getVersion', function () {
    it('returns the current version', function () {
      expect(client.getVersion()).toEqual('__VERSION__')
    })
  })

  describe('configure', function () {
    it('configures client', function () {
      expect(client.configure).toEqual(expect.any(Function))

      client.configure({
        apiKey: 'expected'
      })

      expect(client.config.apiKey).toEqual('expected')
    })

    it('is chainable', function () {
      expect(client.configure({})).toEqual(client)
    })
  })

  it('has a context object', function () {
    expect(client.__context).toEqual({})
  })

  describe('setContext', function () {
    it('merges existing context', function () {
      client.setContext({
        user_id: '1'
      }).setContext({
        foo: 'bar'
      })

      expect(client.__context.user_id).toEqual('1')
      expect(client.__context.foo).toEqual('bar')
    })

    it('is chainable', function () {
      expect(client.setContext({
        user_id: 1
      })).toBe(client)
    })

    it('does not accept non-objects', function () {
      client.setContext('foo')
      expect(client.__context).toEqual({})
    })

    it('keeps previous context when called with non-object', function () {
      client.setContext({
        foo: 'bar'
      }).setContext(false)

      expect(client.__context).toEqual({
        foo: 'bar'
      })
    })
  })

  describe('resetContext', function () {
    it('empties the context with no arguments', function () {
      client.setContext({
        user_id: '1'
      }).resetContext()

      expect(client.__context).toEqual({})
    })

    it('replaces the context with arguments', function () {
      client.setContext({
        user_id: '1'
      }).resetContext({
        foo: 'bar'
      })

      expect(client.__context).toEqual({
        foo: 'bar'
      })
    })

    it('empties the context with non-object argument', function () {
      client.setContext({
        foo: 'bar'
      }).resetContext('foo')

      expect(client.__context).toEqual({})
    })

    it('is chainable', function () {
      expect(client.resetContext()).toBe(client)
    })
  })

  it('responds to notify', function () {
    expect(client.notify).toEqual(expect.any(Function))
  })

  describe('notify', function () {
    it('sends the notice when configured', function () {
      client.configure({
        apiKey: 'testing'
      })

      expect(client.notify(new Error('test'))).toEqual(expect.any(Object))
    })

    it('doesn\'t send the notice when not configured', function () {
      expect(client.notify(new Error('test'))).toEqual(false)
    })

    it('doesn\'t send the notice when disabled', function () {
      client.configure({
        apiKey: 'testing',
        disabled: true
      })
      expect(client.notify(new Error('test'))).toEqual(false)
    })

    it('doesn\'t send the notice when in a development environment', function () {
      client.configure({
        apiKey: 'testing',
        environment: 'development'
      })
      expect(client.notify(new Error('test'))).toEqual(false)
    })

    it('doesn\'t send the notice when reportData is false', function () {
      client.configure({
        apiKey: 'testing',
        reportData: false
      })
      expect(client.notify(new Error('test'))).toEqual(false)
    })

    it('does send the notice from a development environment when reportData is true', function () {
      client.configure({
        apiKey: 'testing',
        environment: 'development',
        reportData: true
      })
      expect(client.notify(new Error('test'))).toEqual(expect.any(Object))
    })

    it('does not send notice without arguments', function () {
      client.configure({
        apiKey: 'testing'
      })

      expect(client.notify()).toEqual(false)
      expect(client.notify(null)).toEqual(false)
      expect(client.notify(null, {})).toEqual(false)
      expect(client.notify({})).toEqual(false)
    })

    it('does not send notice when message is ignored', function () {
      client.configure({
        api_key: 'testing',
        ignorePatterns: [/ignore/i]
      })

      expect(client.notify('you should ignore me')).toEqual(false)
    })

    it('accepts options as first argument', function () {
      client.configure({
        apiKey: 'testing'
      })
      const payload = client.notify({
        message: 'expected message'
      })
      expect(payload.error.message).toEqual('expected message')
    })

    it('accepts name as second argument', function () {
      client.configure({
        apiKey: 'testing'
      })

      const payload = client.notify(new Error('expected message'), 'expected name')

      expect(payload.error.message).toEqual('expected message')
      expect(payload.error.class).toEqual('expected name')
    })

    it('accepts options as second argument', function () {
      client.configure({
        apiKey: 'testing'
      })

      const payload = client.notify(new Error('original message'), {
        message: 'expected message'
      })

      expect(payload.error.message).toEqual('expected message')
    })

    it('accepts options as third argument', function () {
      client.configure({
        apiKey: 'testing'
      })

      const payload = client.notify(new Error('original message'), 'expected name', {
        message: 'expected message'
      })

      expect(payload.error.class).toEqual('expected name')
      expect(payload.error.message).toEqual('expected message')
    })

    // TODO: test pass through of all request data?
    it('sends params', function () {
      client.configure({
        apiKey: 'testing'
      })

      const payload = client.notify('testing', {
        params: {
          foo: 'bar'
        }
      })

      expect(payload.request.params.foo).toEqual('bar')
    })

    it('reads default properties from error objects', function () {
      client.configure({
        apiKey: 'testing'
      })

      let payload
      try {
        throw new Error('Test message')
      } catch (e) {
        payload = client.notify(e)
      }

      expect(payload.error.class).toEqual('Error')
      expect(payload.error.message).toEqual('Test message')
      expect(payload.error.backtrace.length).toBeGreaterThan(0)
    })

    it('reads metadata from error objects', function () {
      client.configure({
        apiKey: 'testing'
      })

      const err = new MyError('Testing')
      err.component = 'expected component'
      const payload = client.notify(err)

      expect(payload.request.component).toEqual('expected component')
    })

    it('merges context from error objects', function () {
      client.configure({
        apiKey: 'testing'
      })

      const err = new MyError('Testing')
      err.context = {
        foo: 'foo'
      }

      const payload = client.notify(err, { context: { bar: 'bar' } })

      expect(payload.request.context).toEqual({ foo: 'foo', bar: 'bar' })
    })

    it('sends the notice with arguments when using ignore patterns and error is null', function () {
      client.configure({
        apiKey: 'testing',
        ignorePatterns: [/ignore/i]
      })

      expect(client.notify(null, 'custom class name')).toEqual(expect.any(Object))
    })

    it('sends the notice when using ignore patterns and message does not respond to match', function () {
      client.configure({
        apiKey: 'testing',
        ignorePatterns: [/care/i]
      })

      expect(client.notify({ message: {} })).toEqual(expect.any(Object))
    })

    it('generates a backtrace when there isn\'t one', function () {
      client.configure({
        apiKey: 'testing'
      })

      const payload = client.notify('expected message')

      expect(payload.error.message).toEqual('expected message')
      expect(payload.error.backtrace.length).toBeGreaterThan(0)
      expect(payload.error.backtrace[0].file).toMatch("client.test.ts")
    })
  })

  describe('beforeNotify', function () {
    beforeEach(function () {
      client.configure({
        apiKey: 'testing',
        environment: 'config environment',
        component: 'config component',
        action: 'config action',
        revision: 'config revision',
        projectRoot: 'config projectRoot'
      })
    })

    it('does not deliver notice when  beforeNotify callback returns false', function () {
      client.beforeNotify(function () {
        return false
      })
      expect(client.notify('testing')).toEqual(false)
    })

    it('delivers notice when beforeNotify returns true', function () {
      client.beforeNotify(function () {
        return true
      })
      expect(client.notify('testing')).toEqual(expect.any(Object))
    })

    it('delivers notice when beforeNotify has no return', function () {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      client.beforeNotify(function () {})
      client.notify('testing')
      expect(client.notify('testing')).toEqual(expect.any(Object))
    })

    it('it is called with default notice properties', function () {
      let notice
      client.beforeNotify(function (n) {
        notice = n
      })

      try {
        throw (new Error('expected message'))
      } catch (e) {
        client.notify(e)
      }

      expect(notice.stack).toEqual(expect.any(String))
      expect(notice.name).toEqual('Error')
      expect(notice.message).toEqual('expected message')
      expect(notice.projectRoot).toEqual('config projectRoot')
      expect(notice.environment).toEqual('config environment')
      expect(notice.component).toEqual('config component')
      expect(notice.action).toEqual('config action')
      expect(notice.fingerprint).toEqual(undefined)
      expect(notice.context).toEqual({})
      expect(notice.params).toEqual(undefined)
      expect(notice.url).toEqual(undefined)
      expect(notice.revision).toEqual('config revision')
    })

    it('it is called with overridden notice properties', function () {
      let notice
      client.beforeNotify(function (n) {
        notice = n
      })

      client.notify({
        stack: 'expected stack',
        name: 'expected name',
        message: 'expected message',
        url: 'expected url',
        projectRoot: 'expected projectRoot',
        environment: 'expected environment',
        component: 'expected component',
        action: 'expected action',
        fingerprint: 'expected fingerprint',
        context: { expected_context_key: 'expected value' },
        params: { expected_params_key: 'expected value' },
        revision: 'expected revision',
        other: 'expected other'
      })

      expect(notice.stack).toEqual('expected stack')
      expect(notice.name).toEqual('expected name')
      expect(notice.message).toEqual('expected message')
      expect(notice.url).toEqual('expected url')
      expect(notice.projectRoot).toEqual('expected projectRoot')
      expect(notice.environment).toEqual('expected environment')
      expect(notice.component).toEqual('expected component')
      expect(notice.action).toEqual('expected action')
      expect(notice.fingerprint).toEqual('expected fingerprint')
      expect(notice.context).toEqual({ expected_context_key: 'expected value' })
      expect(notice.params).toEqual({ expected_params_key: 'expected value' })
      expect(notice.revision).toEqual('expected revision')
      expect(notice.other).toEqual('expected other')
    })

    it('it assigns notice properties', function () {
      client.beforeNotify(function (notice) {
        notice.name = 'expected name'
        notice.message = 'expected message'
        notice.url = 'expected url'
        notice.projectRoot = 'expected projectRoot'
        notice.environment = 'expected environment'
        notice.component = 'expected component'
        notice.action = 'expected action'
        notice.fingerprint = 'expected fingerprint'
        notice.context = { expected_context_key: 'expected value' }
        notice.params = { expected_params_key: 'expected value' }
        notice.revision = 'expected revision'
      })

      const payload = client.notify('notify message')

      expect(payload.error.backtrace).toEqual(expect.any(Array))
      expect(payload.error.class).toEqual('expected name')
      expect(payload.error.message).toEqual('expected message')
      expect(payload.request.url).toEqual('expected url')
      expect(payload.server.project_root).toEqual('expected projectRoot')
      expect(payload.server.environment_name).toEqual('expected environment')
      expect(payload.request.component).toEqual('expected component')
      expect(payload.request.action).toEqual('expected action')
      expect(payload.error.fingerprint).toEqual('expected fingerprint')
      expect(payload.request.context).toEqual({ expected_context_key: 'expected value' })
      expect(payload.request.params).toEqual({ expected_params_key: 'expected value' })
      expect(payload.server.revision).toEqual('expected revision')
    })
  })

  describe('addBreadcrumb', function () {
    it('has default breadcrumbs', function () {
      expect(client.__breadcrumbs).toEqual([])
    })

    it('adds a breadcrumb with defaults', function () {
      client.addBreadcrumb('expected message')

      expect(client.__breadcrumbs.length).toEqual(1)

      const crumb = client.__breadcrumbs[0]

      expect(crumb.message).toEqual('expected message')
      expect(crumb.category).toEqual('custom')
      expect(crumb.metadata).toEqual({})
      expect(crumb.timestamp).toEqual(expect.any(String))
    })

    it('overrides the default category', function () {
      client.addBreadcrumb('message', {
        category: 'test'
      })

      expect(client.__breadcrumbs.length).toEqual(1)
      expect(client.__breadcrumbs[0].category).toEqual('test')
    })

    it('overrides the default metadata', function () {
      client.addBreadcrumb('message', {
        metadata: {
          key: 'expected value'
        }
      })

      expect(client.__breadcrumbs.length).toEqual(1)
      expect(client.__breadcrumbs[0].metadata).toEqual({
        key: 'expected value'
      })
    })

    it('duplicates metadata objects', function () {
      const metadata = {
        key: 'expected value'
      }
      client.addBreadcrumb('message', {
        metadata: metadata
      })
      client.addBreadcrumb('message', {
        metadata: metadata
      })

      expect(client.__breadcrumbs.length).toEqual(2)
      expect(client.__breadcrumbs[0].metadata).toEqual(client.__breadcrumbs[1].metadata)
      expect(client.__breadcrumbs[0].metadata).not.toBe(client.__breadcrumbs[1].metadata)
    })

    it('maintains the size of the breadcrumbs queue', function () {
      for (let i = 0; i <= 45; i++) {
        client.addBreadcrumb('expected message ' + i)
      }

      expect(client.__breadcrumbs.length).toEqual(40)

      expect(client.__breadcrumbs[0].message).toEqual('expected message 6')
      expect(client.__breadcrumbs[39].message).toEqual('expected message 45')
    })

    it('sends breadcrumbs by default', function () {
      client.configure({
        apiKey: 'testing'
      })

      client.addBreadcrumb('expected message')
      const payload = client.notify('message')

      expect(payload.breadcrumbs.enabled).toEqual(true)
      expect(payload.breadcrumbs.trail.length).toEqual(2)
      expect(payload.breadcrumbs.trail[0].message).toEqual('expected message')
    })

    it('sends empty breadcrumbs when disabled', function () {
      client.configure({
        apiKey: 'testing',
        breadcrumbsEnabled: false
      })

      client.addBreadcrumb('message')
      const payload = client.notify('message')

      expect(payload.breadcrumbs.enabled).toEqual(false)
      expect(payload.breadcrumbs.trail).toEqual([])
    })
  })

  it('has default filters', function () {
    expect(client.config.filters).toEqual(['creditcard', 'password'])
  })

  it('filters keys in payload', function () {
    client.configure({
      apiKey: 'testing',
      filters: ['secret']
    })

    const payload = client.notify('message', {
      params: {
        secret: 'secret',
        other: 'expected'
      },
      cgiData: {
        secret: 'secret',
        other: 'expected'
      }
    })

    expect(payload.request.params.secret).toEqual('[FILTERED]')
    expect(payload.request.params.other).toEqual('expected')

    expect(payload.request.cgi_data.secret).toEqual('[FILTERED]')
    expect(payload.request.cgi_data.other).toEqual('expected')
  })
})

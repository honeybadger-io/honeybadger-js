// @ts-ignore
import { nullLogger, TestClient } from '../helpers'
import { Notice } from '../../../src/core/types'

class MyError extends Error {
  context = null
  component = null

  sayHello() {
    return "hello " + this.message
  }
  constructor(m: string) {
    super(m)
  }
}

describe('client', function () {
  let client: TestClient

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
    expect(client.getContext()).toEqual({})
  })

  describe('setContext', function () {
    it('merges existing context', function () {
      client.setContext({
        user_id: '1'
      }).setContext({
        foo: 'bar'
      })

      expect(client.getContext().user_id).toEqual('1')
      expect(client.getContext().foo).toEqual('bar')
    })

    it('is chainable', function () {
      expect(client.setContext({
        user_id: 1
      })).toBe(client)
    })

    it('does not accept non-objects', function () {
      client.setContext(<never>'foo')
      expect(client.getContext()).toEqual({})
    })

    it('keeps previous context when called with non-object', function () {
      client.setContext({
        foo: 'bar'
      }).setContext(<never>false)

      expect(client.getContext()).toEqual({
        foo: 'bar'
      })
    })
  })

  describe('clear', function () {
    it('clears the context and breadcrumbs', function () {
      client.addBreadcrumb('expected message')
      client.setContext({
        user_id: '1'
      })

      expect(client.getContext()).not.toEqual({})
      expect(client.getBreadcrumbs()).not.toEqual([])

      client.clear()

      expect(client.getContext()).toEqual({})
      expect(client.getBreadcrumbs()).toEqual([])
    })
  })

  describe('resetContext', function () {
    it('empties the context with no arguments', function () {
      client.setContext({
        user_id: '1'
      }).resetContext()

      expect(client.getContext()).toEqual({})
    })

    it('replaces the context with arguments', function () {
      client.setContext({
        user_id: '1'
      }).resetContext({
        foo: 'bar'
      })

      expect(client.getContext()).toEqual({
        foo: 'bar'
      })
    })

    it('empties the context with non-object argument', function () {
      client.setContext({
        foo: 'bar'
      }).resetContext(<never>'foo')

      expect(client.getContext()).toEqual({})
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

      expect(client.notify(new Error('test'))).toEqual(true)
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
      expect(client.notify(new Error('test'))).toEqual(true)
    })

    it('does not send notice without arguments', function () {
      client.configure({
        apiKey: 'testing'
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((<any>client).notify()).toEqual(false)
      expect(client.notify(null)).toEqual(false)
      expect(client.notify(null, {})).toEqual(false)
      expect(client.notify({})).toEqual(false)
    })

    it('accepts options as first argument', function () {
      client.configure({
        apiKey: 'testing'
      })
      const payload = client.getPayload({
        message: 'expected message'
      })
      expect(payload.error.message).toEqual('expected message')
    })

    it('accepts name as second argument', function () {
      client.configure({
        apiKey: 'testing'
      })

      const payload = client.getPayload(new Error('expected message'), 'expected name')

      expect(payload.error.message).toEqual('expected message')
      expect(payload.error.class).toEqual('expected name')
    })

    it('accepts options as second argument', function () {
      client.configure({
        apiKey: 'testing'
      })

      const payload = client.getPayload(new Error('original message'), {
        message: 'expected message'
      })

      expect(payload.error.message).toEqual('expected message')
    })

    it('accepts options as third argument', function () {
      client.configure({
        apiKey: 'testing'
      })

      const payload = client.getPayload(new Error('original message'), 'expected name', {
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

      const payload = client.getPayload('testing', {
        params: {
          foo: 'bar'
        }
      })

      expect((payload.request.params as Record<string,string>).foo ).toEqual('bar')
    })

    it('reads default properties from error objects', function () {
      client.configure({
        apiKey: 'testing'
      })

      let payload
      try {
        throw new Error('Test message')
      } catch (e) {
        payload = client.getPayload(e)
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
      const payload = client.getPayload(err)

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

      const payload = client.getPayload(err, { context: { bar: 'bar' } })

      expect(payload.request.context).toEqual({ foo: 'foo', bar: 'bar' })
    })

    it('generates a backtrace when there isn\'t one', function () {
      client.configure({
        apiKey: 'testing'
      })

      const payload = client.getPayload('expected message')

      expect(payload.error.message).toEqual('expected message')
      expect((payload.error.backtrace as Array<Record<string, unknown>>).length).toBeGreaterThan(0)
      expect(payload.error.backtrace[0].file).toMatch("helpers.ts")
    })

    it('sends details', function () {
      client.configure({
        apiKey: 'testing'
      })

      const details = {
        "Expected Section Name": {
          "Expected Key": "Expected Value"
        }
      }

      const payload = client.getPayload("testing", { details: details })

      expect(payload.details).toEqual(details)
    })
  })

  describe('notifyAsync', function () {
    beforeEach(() => {
      client.configure({
        apiKey: 'testing'
      })
    })

    it('resolves when configured', async () => {
      await client.notifyAsync(new Error('test'))
    })

    it('calls afterNotify from client.afterNotify', async () => {
      let called = false
      client.afterNotify((_err) => {
        called = true
      })

      await client.notifyAsync('test test')

      expect(called).toBeTruthy()
    })

    it('calls afterNotify in noticeable', async () => {
      let called = false
      const afterNotify = () => {
        called = true
      }

      await client.notifyAsync({
        message: 'test',
        afterNotify
      })

      expect(called).toBeTruthy()
    })

    it('calls afterNotify in name', async () => {
      let called = false
      const afterNotify = () => {
        called = true
      }

      await client.notifyAsync(new Error('test'), { afterNotify })

      expect(called).toBeTruthy()
    })

    it('calls afterNotify in extra', async () => {
      let called = false
      const afterNotify = () => {
        called = true
      }

      await client.notifyAsync(new Error('test'), 'an error', { afterNotify })

      expect(called).toBeTruthy()
    })

    it('calls afterNotify and then resolves promise', async () => {
      // the afterNotify hook that resolves the promise is called first
      // however, the loop continues to call all handlers before it gives back
      // control to the event loop
      // which means: all afterNotify hooks will be called and then the promise will resolve
      const called: boolean[] = [];
      function register(i: number) {
        called[i] = false
        client.afterNotify(() => {
          called[i] = true
        })
      }

      for (let i =0; i < 100; i++) {
        register(i)
      }

      await client.notifyAsync(new Error('test'))

      expect(called.every(val => val === true)).toBeTruthy()
    })

    it('rejects with error if not configured correctly', async () => {
      client.configure({
        apiKey: null
      })
      await expect(client.notifyAsync(new Error('test'))).rejects.toThrow(new Error('Unable to send error report: no API key has been configured'))
    })

    it('rejects on pre-condition error', async () => {
      client.configure({
        apiKey: 'testing',
        reportData: false
      })

      await expect(client.notifyAsync(new Error('test'))).rejects.toThrow(new Error('Dropping notice: honeybadger.js is in development mode'))
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

    it('does not deliver notice when beforeNotify callback returns false', function () {
      client.beforeNotify(function () {
        return false
      })
      expect(client.notify('testing')).toEqual(false)
    })

    it('delivers notice when beforeNotify returns true', function () {
      client.beforeNotify(function () {
        return true
      })
      expect(client.notify('testing')).toEqual(true)
    })

    it('delivers notice when beforeNotify has no return', function () {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      client.beforeNotify(function () {})
      expect(client.notify('testing')).toEqual(true)
    })

    it('is called with default notice properties', function () {
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

    it('is called with overridden notice properties', function () {
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

    it('assigns notice properties', function () {
      let notice: Notice
      client.beforeNotify(function (n) {
        notice = n
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

      client.notify('notify message')
      const payload = client.getPayload(notice)

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

    it('calls all beforeNotify handlers even if one returns false', function () {
      client.configure({
        apiKey: undefined
      })

      return new Promise<void>(resolve => {
        const expected = 4
        let total = 0
        client.beforeNotify(() => {
          total++
          return false
        })
        client.beforeNotify(() => {
          total++
          return true
        })
        client.beforeNotify(() => {
          total++
          return false
        })
        client.beforeNotify(() => {
          total++
          expect(total).toEqual(expected)
          resolve()
        })

        client.notify('should not report')
      })
    })
  })

  describe('afterNotify', function () {
    it('is called with error if apiKey is not set', function () {
      client.configure({
        apiKey: undefined,
      })

      return new Promise<void>(resolve => {
        client.afterNotify((err) => {
          expect(err.message).toEqual('Unable to send error report: no API key has been configured')
          resolve()
        })

        client.notify('should not report')
      })
    })
    
    it('is called with error if beforeNotify handlers return false', function () {
      client.configure({
        apiKey: 'abc123',
      })

      return new Promise<void>(resolve => {
        client.beforeNotify(() => false)
        client.afterNotify((err) => {
          expect(err.message).toEqual('Will not send error report, beforeNotify handlers returned false')
          resolve()
        })

        client.notify('should not report')
      })
    })

    it('is called when set in the notice object', function () {
      client.configure({
        apiKey: 'abc123',
      })

      return new Promise<void>(resolve => {
        client.beforeNotify((notice) => {
          notice.afterNotify = (err) => {
            expect(err).toBeUndefined()
            resolve()
          }
        })

        client.notify('should report')
      })
    })

    it('calls all afterNotify handlers if preconditions fail', function () {
      client.configure({
        apiKey: 'abc123'
      })

      return new Promise<void>(resolve => {
        let total = 0
        const expected = 2
        const handlerCalled = (err?: Error) => {
          expect(err.message).toEqual('Will not send error report, beforeNotify handlers returned false')
          total++
          if (total === expected) {
            resolve()
          }
        }

        client.beforeNotify((notice) => {
          notice.afterNotify = handlerCalled
        })
        client.beforeNotify(() => false)
        client.afterNotify(handlerCalled)

        client.notify('should not report')
      })
    })
  })

  describe('beforeNotify & afterNotify', function () {
    it('should call before and after notify handlers even if preconditions fail', function () {
      client.configure({
        apiKey: undefined
      })

      return new Promise<void>(resolve => {
        let totalBeforeNotify = 0
        const expectedBeforeNotify = 2
        const beforeNotifyHandler = () => {
          totalBeforeNotify++
        }

        const afterNotifyHandler = (err: Error) => {
          expect(err.message).toEqual('Unable to send error report: no API key has been configured')
          expect(totalBeforeNotify).toEqual(expectedBeforeNotify)
          resolve()
        }

        client.beforeNotify(beforeNotifyHandler)
        client.beforeNotify(beforeNotifyHandler)
        client.afterNotify(afterNotifyHandler)

        client.notify('should not report')
      })
    })
  })

  describe('addBreadcrumb', function () {
    it('has default breadcrumbs', function () {
      expect(client.getBreadcrumbs()).toEqual([])
    })

    it('adds a breadcrumb with defaults', function () {
      client.addBreadcrumb('expected message')

      expect(client.getBreadcrumbs().length).toEqual(1)

      const crumb = client.getBreadcrumbs()[0]

      expect(crumb.message).toEqual('expected message')
      expect(crumb.category).toEqual('custom')
      expect(crumb.metadata).toEqual({})
      expect(crumb.timestamp).toEqual(expect.any(String))
    })

    it('overrides the default category', function () {
      client.addBreadcrumb('message', {
        category: 'test'
      })

      expect(client.getBreadcrumbs().length).toEqual(1)
      expect(client.getBreadcrumbs()[0].category).toEqual('test')
    })

    it('overrides the default metadata', function () {
      client.addBreadcrumb('message', {
        metadata: {
          key: 'expected value'
        }
      })

      expect(client.getBreadcrumbs().length).toEqual(1)
      expect(client.getBreadcrumbs()[0].metadata).toEqual({
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

      expect(client.getBreadcrumbs().length).toEqual(2)
      expect(client.getBreadcrumbs()[0].metadata).toEqual(client.getBreadcrumbs()[1].metadata)
      expect(client.getBreadcrumbs()[0].metadata).not.toBe(client.getBreadcrumbs()[1].metadata)
    })

    it('maintains the size of the breadcrumbs queue', function () {
      for (let i = 0; i <= 45; i++) {
        client.addBreadcrumb('expected message ' + i)
      }

      expect(client.getBreadcrumbs().length).toEqual(40)

      expect(client.getBreadcrumbs()[0].message).toEqual('expected message 6')
      expect(client.getBreadcrumbs()[39].message).toEqual('expected message 45')
    })

    it('sends breadcrumbs by default', function () {
      client.configure({
        apiKey: 'testing'
      })

      client.addBreadcrumb('expected message')
      const payload = client.getPayload('message')

      expect(payload.breadcrumbs.enabled).toEqual(true)
      expect((payload.breadcrumbs.trail as Array<Record<string, unknown>>).length).toEqual(2)
      expect(payload.breadcrumbs.trail[0].message).toEqual('expected message')
    })

    it('sends empty breadcrumbs when disabled', function () {
      client.configure({
        apiKey: 'testing',
        breadcrumbsEnabled: false
      })

      client.addBreadcrumb('message')
      const payload = client.getPayload('message')

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

    const payload = client.getPayload('message', {
      params: {
        secret: 'secret',
        other: 'expected'
      },
      cgiData: {
        secret: 'secret',
        other: 'expected'
      },
      session: {
        secret: 'secret',
        other: 'expected'
      },
      headers: {
        secret: 'secret',
        other: 'expected'
      }
    })

    const reqParams = payload.request.params as Record<string, string>
    expect(reqParams.secret).toEqual('[FILTERED]')
    expect(reqParams.other).toEqual('expected')

    const cgiData = payload.request.cgi_data as Record<string, string>
    expect(cgiData.secret).toEqual('[FILTERED]')
    expect(cgiData.other).toEqual('expected')

    const session = payload.request.session as Record<string, string>
    expect(session.secret).toEqual('[FILTERED]')
    expect(session.other).toEqual('expected')

    expect(cgiData.HTTP_SECRET).toEqual('[FILTERED]')
    expect(cgiData.HTTP_OTHER).toEqual('expected')
  })

  it('filters URL params', function () {
    client.configure({
      apiKey: 'testing',
      filters: ['secret']
    })

    const payload = client.getPayload('testing', {url: 'https://www.example.com/?secret=value&foo=bar'})

    expect(payload.request.url).toEqual('https://www.example.com/?secret=[FILTERED]&foo=bar')
  })


  it('normalizes comma separated tags', function() {
    client.configure({
      apiKey: 'testing'
    })

    const payload = client.getPayload('testing', {tags: '  tag1, &%&@<$^tag2,tag3 , tag4,,tag5,'})
    expect(payload.error.tags).toEqual(['tag1', 'tag2', 'tag3', 'tag4', 'tag5'])
  })

  it('normalizes arrays of tags', function() {
    client.configure({
      apiKey: 'testing'
    })

    const payload = client.getPayload('testing', {tags: ['  tag1,', ',tag2 * /^&:', 'tag3 ', 'tag4', '<script> tag5 </script>']})
    expect(payload.error.tags).toEqual(['tag1', 'tag2', 'tag3', 'tag4', 'scripttag5script'])
  })

  it('sends configured tags to errors', function() {
    client.configure({
      apiKey: 'testing',
      tags: ['tag1']
    })

    const payload = client.getPayload('testing')
    expect(payload.error.tags).toEqual(['tag1'])
  })

  it('sends context tags to errors', function() {
    client.configure({
      apiKey: 'testing',
    })

    client.setContext({tags: 'tag1, tag2'})
    const payload = client.getPayload('testing')
    expect(payload.error.tags).toEqual(['tag1', 'tag2'])
  })

  it('sends config errors, context errors, and notice errors', function() {
    client.configure({
      apiKey: 'testing',
      tags: ['tag4']
    })

    client.setContext({tags: 'tag3'})

    const payload = client.getPayload('testing', {tags: ['tag1, tag2']})
    expect(payload.error.tags).toEqual(['tag1', 'tag2', 'tag3', 'tag4'])
  })

  it("should not send duplicate tags", function() {
    client.configure({
      apiKey: 'testing',
      tags: ['tag1']
    })

    const payload = client.getPayload('testing', {tags: ['tag1']})
    expect(payload.error.tags).toEqual(['tag1'])
  })
})

import * as stackTraceParser from 'stacktrace-parser'
import { nullLogger, TestClient, TestTransport } from './helpers'
import { Notice } from '../src/types'
import { makeBacktrace, DEFAULT_BACKTRACE_SHIFT } from '../src/util'
import { ThrottledEventsLogger } from '../src/throttled_events_logger';

class MyError extends Error {
  context = null
  component = null

  sayHello() {
    return 'hello ' + this.message
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
      environment: null,
      projectRoot: process.cwd()
    }, new TestTransport())
    client.configure()
  })

  describe('getVersion', function () {
    it('returns the current version', function () {
      expect(client.getVersion()).toEqual('__VERSION__')
    })
  })

  describe('configure', function () {
    it('configures client and doesn\'t overwrite existing options', function () {
      expect(client.configure).toEqual(expect.any(Function))

      client.configure({ apiKey: 'expected' })
      client.configure({ reportData: true })

      expect(client.config.apiKey).toEqual('expected')
      expect(client.config.reportData).toEqual(true)
    })

    it('loads plugins', function () {
      jest.spyOn(client, 'loadPlugins')
      client.configure()
      expect(client.loadPlugins).toHaveBeenCalledTimes(1)
    })

    it('is chainable', function () {
      expect(client.configure({})).toEqual(client)
    })

    it('configures event logger from base config', function () {
      client.configure({
        apiKey: 'testing',
      })

      // @ts-ignore
      expect(client.__eventsLogger).toBeInstanceOf(ThrottledEventsLogger)
      // @ts-ignore
      expect(client.__eventsLogger.config.apiKey).toEqual(client.config.apiKey)
    })
  })

  describe('loadPlugins', function () {
    it('does nothing if there are no plugins', function () {
      client.loadPlugins()
      expect(client.getPluginsLoaded()).toEqual(true)
    })

    it('loads all plugins once and reloads as needed', function () {
      const plugin1 = { load: jest.fn() }
      const plugin2 = { load: jest.fn(), shouldReloadOnConfigure: false }
      const plugin3 = { load: jest.fn(), shouldReloadOnConfigure: true }

      const clientWithPlugins = new TestClient({
        logger: nullLogger(),
        __plugins: [ plugin1, plugin2, plugin3 ],
      }, new TestTransport())

      clientWithPlugins.configure()
      expect(plugin1.load).toHaveBeenCalledTimes(1)
      expect(plugin2.load).toHaveBeenCalledTimes(1)
      expect(plugin3.load).toHaveBeenCalledTimes(1)
      expect(client.getPluginsLoaded()).toEqual(true)

      // Only re-loads if shouldReloadOnConfigure is true
      clientWithPlugins.configure()
      expect(plugin1.load).toHaveBeenCalledTimes(1)
      expect(plugin2.load).toHaveBeenCalledTimes(1)
      expect(plugin3.load).toHaveBeenCalledTimes(2)
    })
  })

  it('has a context object', function () {
    expect(client.__getContext()).toEqual({})
  })

  describe('setContext', function () {
    it('merges existing context', function () {
      client.setContext({
        user_id: '1'
      }).setContext({
        foo: 'bar'
      })

      expect(client.__getContext()).toEqual({ user_id: '1', foo: 'bar' })
    })

    it('is chainable', function () {
      expect(client.setContext({
        user_id: 1
      })).toBe(client)
    })

    it('does not accept non-objects', function () {
      client.setContext(<never>'foo')
      expect(client.__getContext()).toEqual({})
    })

    it('keeps previous context when called with non-object', function () {
      client.setContext({
        foo: 'bar'
      }).setContext(<never>false)

      expect(client.__getContext()).toEqual({
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

      expect(client.__getContext()).not.toEqual({})
      expect(client.__getBreadcrumbs()).not.toEqual([])

      client.clear()

      expect(client.__getContext()).toEqual({})
      expect(client.__getBreadcrumbs()).toEqual([])
    })
  })

  describe('resetContext', function () {
    it('empties the context with no arguments', function () {
      client.setContext({
        user_id: '1'
      }).resetContext()

      expect(client.__getContext()).toEqual({})
    })

    it('replaces the context with arguments', function () {
      client.setContext({
        user_id: '1'
      }).resetContext({
        foo: 'bar'
      })

      expect(client.__getContext()).toEqual({
        foo: 'bar'
      })
    })

    it('empties the context with non-object argument', function () {
      client.setContext({
        foo: 'bar'
      }).resetContext(<never>'foo')

      expect(client.__getContext()).toEqual({})
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

      expect((payload.request.params as Record<string, string>).foo).toEqual('bar')
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

    it('properly handles Error-prototype objects', function () {
      client.configure({
        apiKey: 'testing'
      })

      const error = {};
      Object.setPrototypeOf(error, new TypeError('Some error message'))

      expect(client.notify(error)).toEqual(true)
      const payload = client.getPayload(error)
      expect(payload.error.class).toEqual('TypeError')
      expect(payload.error.message).toEqual('Some error message')
      // @ts-ignore
      expect(payload.error.backtrace.length).toBeGreaterThan(0)
    })

    it('sends details', function () {
      client.configure({
        apiKey: 'testing'
      })

      const details = {
        'Expected Section Name': {
          'Expected Key': 'Expected Value'
        }
      }

      const payload = client.getPayload('testing', { details: details })

      expect(payload.details).toEqual(details)
    })
  })

  describe('backtrace', function () {
    it('uses the passed-in backtrace if there is one', function () {
      client.configure({
        apiKey: 'testing'
      })

      const payload = client.getPayload({
        name: 'TestError',
        message: 'I have a custom backtrace',
        backtrace: [{
          file: 'foo.js',
          method: 'doStuff',
          number: 3,
          column: 23,
        }]
      })

      expect(payload.error.backtrace.length).toBe(1)
      expect(payload.error.backtrace[0].file).toBe('foo.js')
    })

    it('generates a backtrace when existing one is not an array or empty', function () {
      client.configure({
        apiKey: 'testing'
      })

      const stringBacktracePayload = client.getPayload({
        name: 'TestError',
        message: 'I have a custom backtrace',
        // @ts-expect-error
        backtrace: 'oops this should not be a string',
      })

      const emptyBacktracePayload = client.getPayload({
        name: 'TestError',
        message: 'I have a custom backtrace',
        backtrace: [],
      })

      expect(stringBacktracePayload.error.backtrace[0].file).toMatch('client.test.ts')
      expect(emptyBacktracePayload.error.backtrace[0].file).toMatch('client.test.ts')
    })

    it('generates a backtrace when there isn\'t one', function () {
      client.configure({
        apiKey: 'testing'
      })

      const payload = client.getPayload('expected message')

      expect(payload.error.message).toEqual('expected message')
      expect((payload.error.backtrace).length).toBeGreaterThan(0)
      expect(payload.error.backtrace[0].file).toMatch('client.test.ts')
    })

    it('returns an empty array when no stack is undefined', function () {
      const backtrace = makeBacktrace(undefined)
      expect(backtrace).toEqual([])
    })

    it('filters out top frames that come from @honeybadger-io (nodejs)', function () {
      const error = new Error('ENOENT: no such file or directory, open \'\'/tmp/file-123456\'\'')
      error.stack = `Error: ENOENT: no such file or directory, open ''/tmp/file-67efc3cb2da4'' 
            at generateStackTrace (/var/www/somebody/node_modules/@honeybadger-io/js/dist/server/honeybadger.js:563:15)
            at Honeybadger.Client.makeNotice (/var/www/somebody/node_modules/@honeybadger-io/js/dist/server/honeybadger.js:985:60)
            at Honeybadger.Client.notify (/var/www/somebody/node_modules/@honeybadger-io/js/dist/server/honeybadger.js:827:27)
            at /var/www/somebody/node_modules/@honeybadger-io/js/dist/server/honeybadger.js:946:19
            at new Promise (<anonymous>)
            at Honeybadger.Client.notifyAsync (/var/www/somebody/node_modules/@honeybadger-io/js/dist/server/honeybadger.js:914:16)
            at HoneybadgerTransport.log (/var/www/somebody/node_modules/@somebody/logger/HoneybadgerTransport.js:18:19)
            at HoneybadgerTransport._write (/var/www/somebody/node_modules/winston-transport/index.js:82:19)
            at doWrite (/var/www/somebody/node_modules/winston-transport/node_modules/readable-stream/lib/_stream_writable.js:409:139)
            at writeOrBuffer (/var/www/somebody/node_modules/winston-transport/node_modules/readable-stream/lib/_stream_writable.js:398:5)
            at HoneybadgerTransport.Writable.write (/var/www/somebody/node_modules/winston-transport/node_modules/readable-stream/lib/_stream_writable.js:307:11)
            at DerivedLogger.ondata (/var/www/somebody/node_modules/winston/node_modules/readable-stream/lib/_stream_readable.js:681:20)
            at DerivedLogger.emit (node:events:525:35)
            at DerivedLogger.emit (node:domain:489:12)
            at addChunk (/var/www/somebody/node_modules/winston/node_modules/readable-stream/lib/_stream_readable.js:298:12)
            at readableAddChunk (/var/www/somebody/node_modules/winston/node_modules/readable-stream/lib/_stream_readable.js:280:11)
            at DerivedLogger.Readable.push (/var/www/somebody/node_modules/winston/node_modules/readable-stream/lib/_stream_readable.js:241:10)
            at DerivedLogger.Transform.push (/var/www/somebody/node_modules/winston/node_modules/readable-stream/lib/_stream_transform.js:139:32)
            at DerivedLogger._transform (/var/www/somebody/node_modules/winston/lib/winston/logger.js:313:12)
            at DerivedLogger.Transform._read (/var/www/somebody/node_modules/winston/node_modules/readable-stream/lib/_stream_transform.js:177:10)
            at DerivedLogger.Transform._write (/var/www/somebody/node_modules/winston/node_modules/readable-stream/lib/_stream_transform.js:164:83)
            at doWrite (/var/www/somebody/node_modules/winston/node_modules/readable-stream/lib/_stream_writable.js:409:139)
            at writeOrBuffer (/var/www/somebody/node_modules/winston/node_modules/readable-stream/lib/_stream_writable.js:398:5)
            at DerivedLogger.Writable.write (/var/www/somebody/node_modules/winston/node_modules/readable-stream/lib/_stream_writable.js:307:11)
            at DerivedLogger.log (/var/www/somebody/node_modules/winston/lib/winston/logger.js:252:14)
            at DerivedLogger.<computed> [as error] (/var/www/somebody/node_modules/winston/lib/winston/create-logger.js:95:19)
            at console.hideMe [as error] (/var/www/somebody/node_modules/@somebody/logger/index.js:83:45)
            at Function.logerror (/var/www/somebody/node_modules/express/lib/application.js:647:43)`
      const backtrace = makeBacktrace(error.stack, true)
      expect(backtrace[0]).toEqual({
        file: '/var/www/somebody/node_modules/@somebody/logger/HoneybadgerTransport.js',
        method: 'HoneybadgerTransport.log',
        number: 18,
        column: 19
      })
    })

    it('filters out top frames that come from @honeybadger-io (browser)', function () {
      const error = new Error('This is a test message reported from an addEventListener callback.')
      error.stack = `Error: This is a test message reported from an addEventListener callback.
            at __webpack_modules__../node_modules/@honeybadger-io/js/dist/browser/honeybadger.js.Client.notify (http://localhost:63342/honeybadger-js/packages/js/examples/webpack/bundle.js:821:28)
            at HTMLButtonElement.<anonymous> (http://localhost:63342/honeybadger-js/packages/js/examples/webpack/bundle.js:2139:10)
            at func.___hb (http://localhost:63342/honeybadger-js/packages/js/examples/webpack/bundle.js:2030:39)`
      const backtrace = makeBacktrace(error.stack, true)
      expect(backtrace[0]).toEqual({
        file: 'http://localhost:63342/honeybadger-js/packages/js/examples/webpack/bundle.js',
        method: 'HTMLButtonElement.<anonymous>',
        number: 2139,
        column: 10
      })
    })

    it('filters out default number of frames if no honeybadger source code is found', function () {
      const error = new Error('This is an error from the test file. Tests are not under @honeybadger-io node_modules so the default backtrace shift will be applied.')
      const originalBacktrace = stackTraceParser.parse(error.stack)
      const shiftedBacktrace = makeBacktrace(error.stack, true)
      expect(originalBacktrace.length).toEqual(shiftedBacktrace.length + DEFAULT_BACKTRACE_SHIFT)
      expect(originalBacktrace[DEFAULT_BACKTRACE_SHIFT]).toMatchObject({
        file: shiftedBacktrace[0].file,
        methodName: shiftedBacktrace[0].method,
        lineNumber: shiftedBacktrace[0].number,
        column: shiftedBacktrace[0].column
      })
    })
  })

  describe('notifyAsync', function () {
    beforeEach(() => {
      client.configure({
        apiKey: 'testing'
      })
    })

    it('resolves when configured', async () => {
      let called = false
      await client.notifyAsync(new Error('test')).then(() => {
        called = true
      })
      expect(called).toBeTruthy()
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

      for (let i = 0; i < 100; i++) {
        register(i)
      }

      await client.notifyAsync(new Error('test'))

      expect(called.every(val => val === true)).toBeTruthy()
    })

    it('rejects with error if not configured correctly', async () => {
      client.configure({
        apiKey: null
      })
      await expect(client.notifyAsync(new Error('test'))).rejects.toThrow(new Error('missing API key'))
    })

    it('rejects on pre-condition error', async () => {
      client.configure({
        apiKey: 'testing',
        reportData: false
      })

      await expect(client.notifyAsync(new Error('test'))).rejects.toThrow(new Error('honeybadger.js is disabled'))
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

    it('does not deliver notice when async beforeNotify callback returns false', function () {
      client.beforeNotify(async function () {
        return false
      })

      return new Promise<void>((resolve) => {
        client.afterNotify((error) => {
          expect(error.message).toEqual('beforeNotify handlers (async) returned false')
          resolve()
        })

        // notify returns true because the beforeNotify callback is async
        expect(client.notify('testing')).toEqual(true)
      })
    })

    it('delivers notice when beforeNotify returns true', function () {
      client.beforeNotify(function () {
        return true
      })
      expect(client.notify('testing')).toEqual(true)
    })

    it('delivers notice when beforeNotify has no return', function () {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      client.beforeNotify(function () { })
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
        const expected = 5
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
        client.beforeNotify(async () => {
          total++
          return true
        })
        client.beforeNotify(() => {
          total++
        })

        client.afterNotify(() => {
          expect(total).toEqual(expected)
          resolve()
        })

        client.notify('should not report')
      })
    })

    it('modifies the notice when an async function is provided', function () {
      const funkyName = 'My funky name'

      client.beforeNotify(async (notice) => {
        const modifyName = () => new Promise<void>((resolve) => {
          setTimeout(() => {
            notice.name = funkyName
            resolve()
          })
        })


        await modifyName()
      })

      return new Promise<void>((resolve) => {
        client.afterNotify((_err, notice) => {
          expect(notice.name).toEqual(funkyName)
          resolve()
        })

        expect(client.notify('Should report and modify notice')).toEqual(true)
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
          expect(err.message).toEqual('missing API key')
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
          expect(err.message).toEqual('beforeNotify handlers returned false')
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
          expect(err.message).toEqual('beforeNotify handlers returned false')
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

    it('accepts an async function', function () {
      client.configure({
        apiKey: 'abc123',
      })

      return new Promise<void>(resolve => {
        client.afterNotify(async (err) => {
          expect(err).toBeUndefined()
          resolve()
        })

        client.notify('should report')
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
          expect(err.message).toEqual('missing API key')
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
      expect(client.__getBreadcrumbs()).toEqual([])
    })

    it('adds a breadcrumb with defaults', function () {
      client.addBreadcrumb('expected message')

      expect(client.__getBreadcrumbs().length).toEqual(1)

      const crumb = client.__getBreadcrumbs()[0]

      expect(crumb.message).toEqual('expected message')
      expect(crumb.category).toEqual('custom')
      expect(crumb.metadata).toEqual({})
      expect(crumb.timestamp).toEqual(expect.any(String))
    })

    it('overrides the default category', function () {
      client.addBreadcrumb('message', {
        category: 'test'
      })

      expect(client.__getBreadcrumbs().length).toEqual(1)
      expect(client.__getBreadcrumbs()[0].category).toEqual('test')
    })

    it('overrides the default metadata', function () {
      client.addBreadcrumb('message', {
        metadata: {
          key: 'expected value'
        }
      })

      expect(client.__getBreadcrumbs().length).toEqual(1)
      expect(client.__getBreadcrumbs()[0].metadata).toEqual({
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

      expect(client.__getBreadcrumbs().length).toEqual(2)
      expect(client.__getBreadcrumbs()[0].metadata).toEqual(client.__getBreadcrumbs()[1].metadata)
      expect(client.__getBreadcrumbs()[0].metadata).not.toBe(client.__getBreadcrumbs()[1].metadata)
    })

    it('maintains the size of the breadcrumbs queue', function () {
      for (let i = 0; i <= 45; i++) {
        client.addBreadcrumb('expected message ' + i)
      }

      expect(client.__getBreadcrumbs().length).toEqual(40)

      expect(client.__getBreadcrumbs()[0].message).toEqual('expected message 6')
      expect(client.__getBreadcrumbs()[39].message).toEqual('expected message 45')
    })

    it('sends breadcrumbs by default', function () {
      client.configure({
        apiKey: 'testing'
      })

      client.addBreadcrumb('expected message')
      const payload = client.getPayload('message')

      expect(payload.breadcrumbs.enabled).toEqual(true)
      expect((payload.breadcrumbs.trail).length).toEqual(2)
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

    const payload = client.getPayload('testing', { url: 'https://www.example.com/?secret=value&foo=bar' })

    expect(payload.request.url).toEqual('https://www.example.com/?secret=[FILTERED]&foo=bar')
  })

  it('normalizes comma separated tags', function () {
    client.configure({
      apiKey: 'testing'
    })

    const payload = client.getPayload('testing', { tags: ' one,two   , three ,four' })
    expect(payload.error.tags).toEqual(['one', 'two', 'three', 'four'])
  })

  it('normalizes arrays of tags', function () {
    client.configure({
      apiKey: 'testing'
    })

    const payload = client.getPayload('testing', { tags: ['  tag1,', ',tag2  ', 'tag3 ', 'tag4', 'tag5 '] })
    expect(payload.error.tags).toEqual(['tag1', 'tag2', 'tag3', 'tag4', 'tag5'])
  })

  it('allows non-word characters in tags while stripping whitespace', function () {
    client.configure({
      apiKey: 'testing'
    })

    const payload = client.getPayload('testing', { tags: 'word,  with_underscore ,with space, with-dash,with$special*char' })
    expect(payload.error.tags).toEqual(['word', 'with_underscore', 'with', 'space', 'with-dash', 'with$special*char'])
  })

  it('sends configured tags to errors', function () {
    client.configure({
      apiKey: 'testing',
      tags: ['tag1']
    })

    const payload = client.getPayload('testing')
    expect(payload.error.tags).toEqual(['tag1'])
  })

  it('sends context tags to errors', function () {
    client.configure({
      apiKey: 'testing',
    })

    client.setContext({ tags: 'tag1, tag2' })
    const payload = client.getPayload('testing')
    expect(payload.error.tags).toEqual(['tag1', 'tag2'])
  })

  it('sends config errors, context errors, and notice errors', function () {
    client.configure({
      apiKey: 'testing',
      tags: ['tag4']
    })

    client.setContext({ tags: 'tag3' })

    const payload = client.getPayload('testing', { tags: ['tag1, tag2'] })
    expect(payload.error.tags).toEqual(['tag1', 'tag2', 'tag3', 'tag4'])
  })

  it('should not send duplicate tags', function () {
    client.configure({
      apiKey: 'testing',
      tags: ['tag1']
    })

    const payload = client.getPayload('testing', { tags: ['tag1'] })
    expect(payload.error.tags).toEqual(['tag1'])
  })

  it('supports nested errors', function () {
    const level1Error = new Error('Level 1')
    const level2Error = new Error('Level 2', { cause: level1Error })
    const level3Error = new Error('Level 3', { cause: level2Error })
    const payload = client.getPayload(level3Error)
    expect(payload.error.class).toEqual(level3Error.name)
    expect(payload.error.message).toEqual(level3Error.message)

    if (level3Error.cause) { // `.cause` in constructor is only supported on certain platforms/Node versions
      expect(payload.error.causes).toHaveLength(2)
      expect(payload.error.causes[0].class).toEqual(level2Error.name)
      expect(payload.error.causes[0].message).toEqual(level2Error.message)
      expect(payload.error.causes[0].backtrace).toBeTruthy()
      expect(payload.error.causes[1].class).toEqual(level1Error.name)
      expect(payload.error.causes[1].message).toEqual(level1Error.message)
      expect(payload.error.causes[1].backtrace).toBeTruthy()
    } else {
      expect(payload.error.causes).toHaveLength(0)
    }
  })

  it('keeps a maximum of 3 nested errors', function () {
    const level1Error = new Error('Level 1')
    const level2Error = new Error('Level 2', { cause: level1Error })
    const level3Error = new Error('Level 3', { cause: level2Error })
    const level4Error = new Error('Level 4', { cause: level3Error })
    const level5Error = new Error('Level 5', { cause: level4Error })
    const payload = client.getPayload(level5Error)
    expect(payload.error.class).toEqual(level5Error.name)
    expect(payload.error.message).toEqual(level5Error.message)

    if (level5Error.cause) { // `.cause` in constructor is only supported on certain platforms/Node versions
      expect(payload.error.causes).toHaveLength(3)
      expect(payload.error.causes[0].class).toEqual(level3Error.name)
      expect(payload.error.causes[1].class).toEqual(level2Error.name)
      expect(payload.error.causes[2].class).toEqual(level1Error.name)
    } else {
      expect(payload.error.causes).toHaveLength(0)
    }
  })
})

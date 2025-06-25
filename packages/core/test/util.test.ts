import { fake } from 'sinon'
import {
  merge,
  mergeNotice,
  objectIsEmpty,
  runBeforeNotifyHandlers,
  runAfterNotifyHandlers,
  shallowClone,
  sanitize,
  logger,
  filter,
  filterUrl,
  logDeprecatedMethod,
  getSourceForBacktrace
} from '../src/util'
import { nullLogger, TestClient, TestTransport } from './helpers'

describe('utils', function () {
  describe('filterUrl', function () {
    it('filters query string', function () {
      expect(filterUrl('https://www.example.com/?secret=value', ['secret'])).toEqual('https://www.example.com/?secret=[FILTERED]')
    })

    it('filters query string with empty param', function () {
      expect(filterUrl('https://www.example.com/?secret=&foo=bar', ['secret'])).toEqual('https://www.example.com/?secret=[FILTERED]&foo=bar')
    })

    it('returns untouched url with malformed param', function () {
      expect(filterUrl('https://www.example.com/?secret&foo=bar', ['secret'])).toEqual('https://www.example.com/?secret&foo=bar')
    })

    it('returns untouched url with filters', function () {
      expect(filterUrl('https://www.example.com/', ['secret'])).toEqual('https://www.example.com/')
      expect(filterUrl('https://www.example.com/?foo=bar', ['secret'])).toEqual('https://www.example.com/?foo=bar')
    })

    it('returns untouched url without filters', function () {
      expect(filterUrl('https://www.example.com/', [])).toEqual('https://www.example.com/')
      expect(filterUrl('https://www.example.com/?foo=bar', [])).toEqual('https://www.example.com/?foo=bar')
    })
  })

  describe('filter', function () {
    it('filters partial match', function () {
      expect(filter({ secret_key: 'secret' }, ['secret'])).toEqual({ secret_key: '[FILTERED]' })
    })

    it('ignores case', function () {
      expect(filter({ foo: 'secret', FOO: 'secret' }, ['Foo'])).toEqual({ foo: '[FILTERED]', FOO: '[FILTERED]' })
    })
  })

  describe('logger', function() {
    it('skips debug logging by default', function () {
      const mockDebug = jest.fn()
      const console = nullLogger()
      console.debug = mockDebug
      const client = new TestClient({ logger: console }, new TestTransport())

      logger(client).debug('expected')

      expect(mockDebug.mock.calls.length).toBe(0)
    })

    it('logs to console when debug logging is enabled', function () {
      const mockDebug = jest.fn()
      const console = nullLogger()
      console.log = mockDebug
      const client = new TestClient({ logger: console, debug: true }, new TestTransport())

      logger(client).debug('expected')

      expect(mockDebug.mock.calls.length).toBe(1)
      expect(mockDebug.mock.calls[0][0]).toBe('[Honeybadger]')
      expect(mockDebug.mock.calls[0][1]).toBe('expected')
    })
  })

  describe('merge', function () {
    it('combines two objects', function () {
      expect(merge({ foo: 'foo' }, { bar: 'bar' })).toEqual({ foo: 'foo', bar: 'bar' })
    })
  })

  describe('mergeNotice', function () {
    it('combines two notice objects', function () {
      expect(mergeNotice({ name: 'foo' }, { message: 'bar' })).toEqual({ name: 'foo', message: 'bar' })
    })

    it('combines context properties', function () {
      expect(mergeNotice({ context: { foo: 'foo' } }, { context: { bar: 'bar' } })).toEqual({ context: { foo: 'foo', bar: 'bar' } })
    })
  })

  describe('objectIsEmpty', function () {
    it('returns true when empty', function () {
      expect(objectIsEmpty({})).toEqual(true)
    })

    it('returns false when not empty', function () {
      expect(objectIsEmpty({ foo: 'bar' })).toEqual(false)
    })
  })

  describe('runBeforeNotifyHandlers', function () {
    it('returns false when any handler returns false', function () {
      const handlers = [
        () => false,
        () => true
      ]
      expect(runBeforeNotifyHandlers(<never>{}, handlers).result).toEqual(false)
    })

    it('returns true when all handlers return true', function () {
      const handlers = [
        () => true,
        () => true
      ]
      expect(runBeforeNotifyHandlers(<never>{}, handlers).result).toEqual(true)
    })

    it('passes the notice to handlers', function () {
      const notice = fake()
      const handlers = [
        (notice) => { notice.call() }
      ]
      runBeforeNotifyHandlers(notice, handlers)
      expect(notice.called).toEqual(true)
    })

    it('allows handlers to mutate notice', function () {
      const notice = { first: undefined, second: undefined }
      const handlers = [
        (notice) => { notice.first = 'first expected' },
        (notice) => { notice.second = 'second expected' }
      ]
      runBeforeNotifyHandlers(<never>notice, handlers)
      expect(notice.first).toEqual('first expected')
      expect(notice.second).toEqual('second expected')
    })
  })

  describe('runAfterNotifyHandlers', function () {
    it('passes the notice to handlers', function () {
      const notice = fake()
      const handlers = [
        (_error, notice) => { notice.call() }
      ]
      runAfterNotifyHandlers(notice, handlers)
      expect(notice.called).toEqual(true)
    })

    it('passes the error to handlers', function () {
      const error = fake()
      const handlers = [
        (error, _notice) => { error.call() }
      ]
      runAfterNotifyHandlers(<never>{}, handlers, error)
      expect(error.called).toEqual(true)
    })
  })

  describe('newObject', function () {
    it('returns a new object', function () {
      const obj = { expected: 'value' }
      expect(shallowClone(obj)).toEqual(obj)
      expect(shallowClone(obj)).not.toBe(obj)
    })
  })

  describe('sanitize', function () {
    it('enforces configured max depth', function () {
      expect(
        sanitize(
          { one: { two: { three: { four: 'five' } } } },
          3
        )
      ).toEqual(
        { one: { two: { three: '[DEPTH]' } } }
      )
    })

    it('drops undefined values', function () {
      expect(
        sanitize(
          { foo: undefined, bar: 'baz' }
        )
      ).toEqual(
        { bar: 'baz' }
      )
    })

    it('drops function values', function () {
      expect(
        sanitize(
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          { foo: function () { }, bar: 'baz' }
        )
      ).toEqual(
        { foo: '[object Function]', bar: 'baz' }
      )
    })

    it('drops circular references', function () {
      const obj = { obj: null }
      obj.obj = obj

      expect(
        sanitize(obj)
      ).toEqual(
        {
          obj: '[RECURSION]'
        }
      )
    })

    it('drops null array items', function () {
      expect(
        sanitize(
          { obj: ['first', null] },
          6
        )
      ).toEqual(
        { obj: ['first', '[object Null]'] }
      )
    })

    it('enforces max depth in arrays', function () {
      expect(
        sanitize(
          {
            one: ['two', ['three', ['four', ['five', ['six', ['seven', ['eight', ['nine']]]]]]]]
          },
          6
        )
      ).toEqual(
        {
          one: ['two', ['three', ['four', ['five', ['[DEPTH]', '[DEPTH]']]]]]
        }
      )
    })

    it('supports toJSON() of objects', function () {
      expect(
        JSON.parse(JSON.stringify(sanitize(
          {
            ignored: false,
            aProperty: {
              thisShouldBeIgnored: true,
              toJSON: () => {
                return {
                  bProperty: true
                }
              }
            },
          },
          6
        )))
      ).toEqual(
        {
          ignored: false,
          aProperty: {
            bProperty: true
          }
        }
      )
    })

    if (typeof Object.create === 'function') {
      it('handles objects without prototypes as values', function () {
        const obj = Object.create(null)

        expect(
          sanitize(
            {
              key: obj
            }
          )
        ).toEqual(
          { key: '[object Object]' }
        )
      })
    }

    if (typeof Symbol === 'function') {
      it('serializes symbol values', function () {
        const sym = Symbol('test')

        expect(
          sanitize(
            {
              key: sym
            }
          )
        ).toEqual(
          { key: '[object Symbol]' }
        )
      })

      it('drops symbol keys', function () {
        const sym = Symbol('test')
        const obj = {}
        obj[sym] = 'value'

        expect(
          sanitize(obj)
        ).toEqual({})
      })
    }

    it('handles other errors', function () {
      const obj = []
      // This will cause the map operation to blow up
      obj.map = () => { throw(new Error('expected error')) }
      expect(
        sanitize({ obj: obj })
      ).toEqual(
        { obj: '[ERROR] Error: expected error' }
      )
    })
  })

  describe('logDeprecatedMethod', function () {
    it('should log a deprecation warning', function () {
      const console = nullLogger()
      const warnSpy = jest.spyOn(console, 'warn')
      logDeprecatedMethod(console, 'deprecatedMethod', 'newMethod');
      expect(warnSpy).toHaveBeenNthCalledWith(1, 'Deprecation warning: deprecatedMethod has been deprecated; please use newMethod instead.')
    });

    it('should log a deprecation warning only once even if called multiple times', function () {
      const console = nullLogger()
      const warnSpy = jest.spyOn(console, 'warn')
      logDeprecatedMethod(console, 'deprecatedMethod2', 'newMethod2', 5);
      logDeprecatedMethod(console, 'deprecatedMethod2', 'newMethod2', 5);
      logDeprecatedMethod(console, 'deprecatedMethod2', 'newMethod2', 5);
      logDeprecatedMethod(console, 'deprecatedMethod2', 'newMethod2', 5);
      logDeprecatedMethod(console, 'deprecatedMethod2', 'newMethod2', 5);
      expect(warnSpy).toHaveBeenCalledTimes(1)
    })

    it('should log two deprecation warnings if the method is called more than the specified call count', function () {
      const console = nullLogger()
      const warnSpy = jest.spyOn(console, 'warn')
      logDeprecatedMethod(console, 'deprecatedMethod3', 'newMethod3', 3);
      logDeprecatedMethod(console, 'deprecatedMethod3', 'newMethod3', 3);
      logDeprecatedMethod(console, 'deprecatedMethod3', 'newMethod3', 3);
      logDeprecatedMethod(console, 'deprecatedMethod3', 'newMethod3', 3);
      expect(warnSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('getSourceForBacktrace minified/bundled detection', function () {
    it('excludes files with high column numbers (bundled/minified)', async function () {
      const mockGetSourceFile = async (path: string): Promise<string> => {
        return 'normal source code content'
      }

      const backtrace = [{
        file: '/path/to/bundled.js',
        method: 'someFunction',
        number: 1,
        column: 141907
      }]

      const result = await getSourceForBacktrace(backtrace, mockGetSourceFile)
      expect(result[0]['1']).toBe('SOURCE_SIZE_TOO_LARGE')
    })

    it('includes normal source files with reasonable column numbers', async function () {
      const mockGetSourceFile = async (path: string): Promise<string> => {
        const normalSource = [
          'function example() {',
          '  const someVariable = "this is a normal line"',
          '  return someVariable',
          '}',
          '// This is a comment',
          'console.log("test")'
        ].join('\n')
        return normalSource
      }

      const backtrace = [{
        file: '/path/to/normal.js',
        method: 'example',
        number: 2,
        column: 10
      }]

      const result = await getSourceForBacktrace(backtrace, mockGetSourceFile)
      expect(result[0]).not.toBeNull()
      expect(result[0]['1']).toBe('function example() {')
      expect(result[0]['2']).toBe('  const someVariable = "this is a normal line"')
      expect(result[0]['3']).toBe('  return someVariable')
    })

    it('handles empty or null file content gracefully', async function () {
      const mockGetSourceFile = async (path: string): Promise<string> => {
        return null
      }

      const backtrace = [{
        file: '/path/to/missing.js',
        method: 'someFunction',
        number: 1,
        column: 1
      }]

      const result = await getSourceForBacktrace(backtrace, mockGetSourceFile)
      expect(result[0]).toBeNull()
    })

    it('detects large bundled files and excludes them', async function () {
      const mockGetSourceFile = async (path: string): Promise<string> => {
        const largeContent = 'console.log("test");\n'.repeat(50000)
        return largeContent
      }

      const backtrace = [{
        file: '/path/to/large-bundle.js',
        method: 'someFunction',
        number: 1000,
        column: 10
      }]

      const result = await getSourceForBacktrace(backtrace, mockGetSourceFile)
      expect(result[0]['1000']).toBe('SOURCE_SIZE_TOO_LARGE')
    })

    it('detects files with very long lines and excludes them', async function () {
      const mockGetSourceFile = async (path: string): Promise<string> => {
        const longLine = 'a'.repeat(10100)
        const content = [
          'function test() {',
          `  const x = "${longLine}"`,
          '  return x',
          '}'
        ].join('\n')
        return content
      }

      const backtrace = [{
        file: '/path/to/long-line.js',
        method: 'test',
        number: 2,
        column: 10
      }]

      const result = await getSourceForBacktrace(backtrace, mockGetSourceFile)
      expect(result[0]['2']).toBe('SOURCE_SIZE_TOO_LARGE')
    })

  })
})

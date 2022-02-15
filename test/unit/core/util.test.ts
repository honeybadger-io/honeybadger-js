import sinon from 'sinon'
import Client from '../../../src/core/client'
import { merge, mergeNotice, objectIsEmpty, makeBacktrace, runBeforeNotifyHandlers, runAfterNotifyHandlers, newObject, sanitize, logger, filter, filterUrl } from '../../../src/core/util'
import { nullLogger } from '../helpers'

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
      expect(filter({secret_key: 'secret'}, ['secret'])).toEqual({ secret_key: '[FILTERED]' })
    })

    it('ignores case', function () {
      expect(filter({foo: 'secret', FOO: 'secret'}, ['Foo'])).toEqual({ foo: '[FILTERED]', FOO: '[FILTERED]' })
    })
  })

  describe('logger', function() {
    it('skips debug logging by default', function () {
      const mockDebug = jest.fn()
      const console = nullLogger()
      console.debug = mockDebug
      const client = new Client({ logger: console })

      logger(client).debug('expected')

      expect(mockDebug.mock.calls.length).toBe(0)
    })

    it('logs debug to console when enabled', function () {
      const mockDebug = jest.fn()
      const console = nullLogger()
      console.debug = mockDebug
      const client = new Client({ logger: console, debug: true })

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

  describe('makeBacktrace', function () {
    it('returns a parsed stacktrace in Honeybadger format', function () {
      const stack = 'Error: Something unexpected has occurred.\n\tat bar (foo.js:1:2)'
      expect(makeBacktrace(stack)).toEqual([
        {
          file: 'foo.js',
          method: 'bar',
          number: 1,
          column: 2
        }
      ])
    })

    it('returns and empty array when no stack is undefined', function () {
      expect(makeBacktrace(undefined)).toEqual([])
    })
  })

  describe('runBeforeNotifyHandlers', function () {
    it('returns false when any handler returns false', function () {
      const handlers = [
        () => false,
        () => true
      ]
      expect(runBeforeNotifyHandlers({}, handlers)).toEqual(false)
    })

    it('returns true when all handlers return true', function () {
      const handlers = [
        () => true,
        () => true
      ]
      expect(runBeforeNotifyHandlers({}, handlers)).toEqual(true)
    })

    it('passes the notice to handlers', function () {
      const notice = sinon.fake()
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
      runBeforeNotifyHandlers(notice, handlers)
      expect(notice.first).toEqual('first expected')
      expect(notice.second).toEqual('second expected')
    })
  })

  describe('runAfterNotifyHandlers', function () {
    it('passes the notice to handlers', function () {
      const notice = sinon.fake()
      const handlers = [
        (_error, notice) => { notice.call() }
      ]
      runAfterNotifyHandlers(notice, handlers)
      expect(notice.called).toEqual(true)
    })

    it('passes the error to handlers', function () {
      const error = sinon.fake()
      const handlers = [
        (error, _notice) => { error.call() }
      ]
      runAfterNotifyHandlers({}, handlers, error)
      expect(error.called).toEqual(true)
    })
  })

  describe('newObject', function () {
    it('returns a new object', function () {
      const obj = { expected: 'value' }
      expect(newObject(obj)).toEqual(obj)
      expect(newObject(obj)).not.toBe(obj)
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

    // eslint-disable-next-line mocha/no-setup-in-describe
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
      obj.map = () => { throw(new Error("expected error")) }
      expect(
        sanitize({ obj: obj })
      ).toEqual(
        { obj: `[ERROR] Error: expected error` }
      )
    })
  })
})

import {fake} from 'sinon'
import { merge, mergeNotice, objectIsEmpty, runBeforeNotifyHandlers, runAfterNotifyHandlers, shallowClone, sanitize, logger, filter, filterUrl } from '../../../src/core/util'
// @ts-ignore
import { nullLogger, TestClient, TestTransport } from '../helpers'

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
      expect(runBeforeNotifyHandlers(<never>{}, handlers)).toEqual(false)
    })

    it('returns true when all handlers return true', function () {
      const handlers = [
        () => true,
        () => true
      ]
      expect(runBeforeNotifyHandlers(<never>{}, handlers)).toEqual(true)
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
      obj.map = () => { throw(new Error("expected error")) }
      expect(
        sanitize({ obj: obj })
      ).toEqual(
        { obj: `[ERROR] Error: expected error` }
      )
    })
  })
})

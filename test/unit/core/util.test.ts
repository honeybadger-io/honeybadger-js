import sinon from 'sinon'
import { merge, mergeNotice, objectIsEmpty, makeBacktrace, runBeforeNotifyHandlers, runAfterNotifyHandlers, isIgnored, newObject, sanitize } from '../../../src/core/util'

describe('utils', function () {
  describe('merge', function () {
    it('combines two objects', function () {
      expect(merge({ foo: 'foo' }, { bar: 'bar' })).toEqual({ foo: 'foo', bar: 'bar' })
    })
  })

  describe('mergeNotice', function () {
    it('combines two objects', function () {
      expect(mergeNotice({ foo: 'foo' }, { bar: 'bar' })).toEqual({ foo: 'foo', bar: 'bar' })
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

  describe('isIgnored', function () {
    it('returns false when patterns are missing', function () {
      const notice = {
        message: 'message'
      }
      expect(isIgnored(notice, undefined)).toEqual(false)
    })

    it('returns false when message is missing', function () {
      const notice = {}
      expect(isIgnored(notice, [])).toEqual(false)
    })

    it('returns false when patterns are empty', function () {
      const patterns = [/ignore/]
      const notice = {}
      expect(isIgnored(notice, patterns)).toEqual(false)
    })

    it('returns true when any pattern matches', function () {
      const patterns = [/foo/, /ignore/, /bar/]
      const notice = {
        message: 'please ignore this error'
      }
      expect(isIgnored(notice, patterns)).toEqual(true)
    })

    it('returns false when patterns don\'t match', function () {
      const patterns = [/foo/, /ignore/, /bar/]
      const notice = {
        message: 'please report this error'
      }
      expect(isIgnored(notice, patterns)).toEqual(false)
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
  })
})

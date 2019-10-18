import sanitize from '../../src/util/sanitize.js';

describe('utils/sanitize', () => {
  it('enforces configured max depth', () => {
    expect(
      sanitize(
        { one: { two: { three: { four: 'five' } } } },
        3
      )
    ).toEqual(
      { one: { two: { three: '[DEPTH]' } } }
    );
  });

  it('drops undefined values', () => {
    expect(
      sanitize(
        { foo: void 0, bar: 'baz' }
      )
    ).toEqual(
      { bar: 'baz' }
    );
  });

  it('drops function values', () => {
    expect(
      sanitize(
        { foo: function() {}, bar: 'baz', }
      )
    ).toEqual(
      { foo: '[object Function]', bar: 'baz' }
    );
  });

  it('drops circular references', () => {
    let obj = {};
    obj.obj = obj;

    expect(
      sanitize(obj)
    ).toEqual(
      {
        obj: '[RECURSION]'
      }
    );
  });

  it('enforces max depth in arrays', () => {
    expect(
      sanitize(
        {
          'one': ['two', ['three', [ 'four', [ 'five', [ 'six', [ 'seven', [ 'eight', [ 'nine' ]]]]]]]]
        },
        6
      )
    ).toEqual(
      {
        'one': ['two', ['three', [ 'four', [ 'five', [ '[DEPTH]', '[DEPTH]' ]]]]]
      }
    );
  });

  if (typeof Object.create === 'function') {
    it('handles objects without prototypes as values', () => {
      const obj = Object.create(null);

      expect(
        sanitize(
          {
            key: obj,
          }
        )
      ).toEqual(
        {key: '[object Object]'}
      );
    });
  }

  if (typeof Symbol === 'function') {
    it('serializes symbol values', () => {
      const sym = Symbol();

      expect(
        sanitize(
          {
            key: sym,
          }
        )
      ).toEqual(
        { key: '[object Symbol]' }
      );
    });

    it('drops symbol keys', () => {
      const sym = Symbol();
      let obj = {};
      obj[sym] = 'value';

      expect(
        sanitize(obj)
      ).toEqual({});
    });
  }
});

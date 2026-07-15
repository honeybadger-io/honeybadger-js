import { stringNameOfElement, stringSelectorOfElement, stringTextOfElement } from '../../../src/browser/util'

describe('utils/browser', function () {
  describe('stringNameOfElement', function () {
    it('returns the name of the element', function () {
      const element = document.createElement('button')

      expect(
        stringNameOfElement(element)
      ).toEqual(
        'button'
      )
    })

    it('returns a blank string when not an element', function () {
      expect(
        stringNameOfElement({} as HTMLElement)
      ).toEqual(
        ''
      )
    })

    it('returns a blank string when element is undefined', function () {
      expect(
        stringNameOfElement(undefined)
      ).toEqual(
        ''
      )
    })

    it('includes the element id when available', function () {
      const element = document.createElement('button')
      element.id = 'expected_id'

      expect(
        stringNameOfElement(element)
      ).toEqual(
        'button#expected_id'
      )
    })

    it('includes nth-child(i) when it has siblings', function () {
      const container = document.createElement('button')
      const element1 = document.createElement('button')
      const element2 = document.createElement('button')

      container.appendChild(element1)
      container.appendChild(element2)

      expect(stringNameOfElement(element1)).toEqual('button:nth-child(1)')
      expect(stringNameOfElement(element2)).toEqual('button:nth-child(2)')
    })

    it('includes whitelisted attributes', function () {
      const element = document.createElement('button')
      element.setAttribute('alt', 'alt value')
      element.setAttribute('name', 'name value')
      element.setAttribute('title', 'title value')
      element.setAttribute('type', 'type value')

      expect(
        stringNameOfElement(element)
      ).toEqual(
        'button[alt="alt value"][name="name value"][title="title value"][type="type value"]'
      )
    })

    it('excludes non-whitelisted attributes', function () {
      const element = document.createElement('button')
      element.setAttribute('other', 'other value')

      expect(
        stringNameOfElement(element)
      ).not.toMatch('other')
    })

    it('includes CSS class names', function () {
      const element = document.createElement('button')
      element.setAttribute('class', 'foo bar baz')

      expect(
        stringNameOfElement(element)
      ).toEqual('button.foo.bar.baz')
    })

    it('returns the clean name from the default data-hb-name attribute', function () {
      const element = document.createElement('button')
      element.setAttribute('class', 'foo bar baz')
      element.setAttribute('data-hb-name', 'foo-button')

      expect(stringNameOfElement(element)).toEqual('foo-button')
    })

    it('honors a custom attribute list and ignores data-hb-name when not listed', function () {
      const element = document.createElement('button')
      element.setAttribute('data-hb-name', 'ignored')
      element.setAttribute('data-testid', 'foo-button')

      expect(stringNameOfElement(element, ['data-testid'])).toEqual('foo-button')
    })

    it('uses the first matching attribute in the list', function () {
      const element = document.createElement('button')
      element.setAttribute('data-hb-name', 'primary')
      element.setAttribute('data-testid', 'secondary')

      expect(stringNameOfElement(element, ['data-hb-name', 'data-testid'])).toEqual('primary')
    })

    it('falls back to tag/class output when the attribute value is blank', function () {
      const element = document.createElement('button')
      element.setAttribute('class', 'foo')
      element.setAttribute('data-hb-name', '   ')

      expect(stringNameOfElement(element)).toEqual('button.foo')
    })

    it('collapses internal whitespace and newlines in the clean name', function () {
      const element = document.createElement('button')
      element.setAttribute('data-hb-name', 'foo   bar\nbaz')

      expect(stringNameOfElement(element)).toEqual('foo bar baz')
    })

    it('truncates long clean names to 100 chars plus ellipsis', function () {
      const element = document.createElement('button')
      element.setAttribute('data-hb-name', 'x'.repeat(150))

      expect(stringNameOfElement(element)).toEqual('x'.repeat(100) + '...')
    })

    it('ignores data-hb-name on the html element', function () {
      const element = document.createElement('html')
      element.setAttribute('data-hb-name', 'nope')

      expect(stringNameOfElement(element)).toEqual('')
    })

    it('does not throw on malformed attributes config', function () {
      const element = document.createElement('button')
      element.setAttribute('class', 'foo')

      expect(stringNameOfElement(element, null)).toEqual('button.foo')
      // @ts-expect-error intentionally malformed input
      expect(stringNameOfElement(element, [123, ''])).toEqual('button.foo')
    })

    it('disables naming when given an empty attribute list', function () {
      const element = document.createElement('button')
      element.setAttribute('data-hb-name', 'foo-button')

      expect(stringNameOfElement(element, [])).toEqual('button')
    })
  })

  describe('stringSelectorOfElement', function () {
    it('includes parent elements', function () {
      const html = document.createElement('html')
      const body = document.createElement('body')
      const div = document.createElement('div')
      const element = document.createElement('button')

      html.appendChild(body)
      body.appendChild(div)
      div.appendChild(element)

      expect(
        stringSelectorOfElement(element)
      ).toEqual(
        'body > div > button'
      )
    })
  })

  describe('stringTextOfElement', function () {
    it('returns the text of the element', function () {
      const element = document.createElement('div')
      const node = document.createTextNode('expected text')

      element.appendChild(node)

      expect(
        stringTextOfElement(element)
      ).toEqual(
        'expected text'
      )
    })

    it('truncates long strings', function () {
      function repeat(string, num) {
        let result = string
        for (let i = 1; i < num; i++) {
          result += string
        }
        return result
      }

      const element = document.createElement('div')
      const node = document.createTextNode(repeat('*', 400))

      element.appendChild(node)

      expect(
        stringTextOfElement(element)
      ).toEqual(
        repeat('*', 300) + '...'
      )
    })
  })
})

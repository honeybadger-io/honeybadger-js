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
        stringNameOfElement({})
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

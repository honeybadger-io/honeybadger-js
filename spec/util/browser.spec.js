import { stringNameOfElement, stringSelectorOfElement, stringTextOfElement } from '../../src/util/browser.js';

describe('utils/browser', () => {
  describe('stringNameOfElement', () => {
    it('returns the name of the element', () => {
      let element = document.createElement('button');

      expect(
        stringNameOfElement(element)
      ).toEqual(
        'button'
      );
    });

    it('returns a blank string when not an element', () => {
      expect(
        stringNameOfElement({})
      ).toEqual(
        ''
      );
    });

    it('returns a blank string when element is undefined', () => {
      expect(
        stringNameOfElement()
      ).toEqual(
        ''
      );
    });

    it('includes the element id when available', () => {
      let element = document.createElement('button');
      element.id = 'expected_id';

      expect(
        stringNameOfElement(element)
      ).toEqual(
        'button#expected_id'
      );
    });
  });

  describe('stringSelectorOfElement', () => {
    it('includes parent elements', () => {
      let body = document.createElement('body');
      let div = document.createElement('div');
      let element = document.createElement('button');

      body.appendChild(div);
      div.appendChild(element);

      expect(
        stringSelectorOfElement(element)
      ).toEqual(
        'body > div > button'
      );
    });
  });

  describe('stringTextOfElement', () => {
    it('returns the text of the element', () => {
      let element = document.createElement('div');
      let node = document.createTextNode('expected text');

      element.appendChild(node);

      expect(
        stringTextOfElement(element)
      ).toEqual(
        'expected text'
      );
    });
  });
});

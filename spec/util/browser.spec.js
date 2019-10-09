import { stringNameOfElement } from '../../src/util/browser.js';

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
});

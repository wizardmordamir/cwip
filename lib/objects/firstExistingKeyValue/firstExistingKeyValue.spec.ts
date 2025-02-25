import { firstExistingKeyValue } from '.';

describe('firstExistingKeyValue', () => {
  it('should get first existing key value', () => {
    const val = { a: 1, b: null, c: { d: 1 } };
    expect(firstExistingKeyValue(['b', 1, 'a', 'c', 2], val)).toEqual(1);
  });
});

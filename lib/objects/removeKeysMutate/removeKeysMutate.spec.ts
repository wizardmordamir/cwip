import { removeKeysMutate } from '.';

describe('removeKeysMutate', () => {
  it('should remove keys', () => {
    const val = { a: 1, b: null, c: { d: 1 } };
    const expected = { a: 1 };
    expect(removeKeysMutate(['b', 'c'], val)).toEqual(expected);
  });

  it('should remove no keys', () => {
    const val = { a: 1, b: null, c: { d: 1 } };
    expect(removeKeysMutate(['d', 'e', 'f'], val)).toEqual(val);
  });
});

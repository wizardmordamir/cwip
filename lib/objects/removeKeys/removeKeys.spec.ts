import { removeKeys } from '.';

describe('removeKeys', () => {
  it('should remove keys', () => {
    const val = { a: 1, b: null, c: { d: 1 } };
    const expected = { a: 1 };
    expect(removeKeys(['b', 'c'], val)).toEqual(expected);
  });

  it('should remove no keys', () => {
    const val = { a: 1, b: null, c: { d: 1 } };
    expect(removeKeys(['d', 'e', 'f'], val)).toEqual(val);
  });
});

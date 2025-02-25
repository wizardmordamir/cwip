import { hasAllKeys } from '.';

describe('hasAllKeys', () => {
  it('should find all keys', () => {
    const val = { a: 1, b: null, c: { d: 1 } };
    expect(hasAllKeys(['a', 'b', 'c'], val)).toEqual(true);
  });

  it('should not find all keys', () => {
    const val = { a: 1, b: null, c: { d: 1 } };
    expect(hasAllKeys(['a', 'b', 'c', 'd', 'e', 'f'], val)).toEqual(false);
  });
});

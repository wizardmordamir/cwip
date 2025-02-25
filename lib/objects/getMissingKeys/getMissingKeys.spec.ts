import { getMissingKeys } from '.';

describe('getMissingKeys', () => {
  it('should get missing keys', () => {
    const val = { a: 1, b: null, c: { d: 1 } };
    expect(getMissingKeys(['a', 'b', 'c', 'd', 'e', 'f'], val)).toEqual(['d', 'e', 'f']);
  });

  it('should get no missing keys', () => {
    const val = { a: 1, b: null, c: { d: 1 } };
    expect(getMissingKeys(['a', 'b', 'c'], val)).toEqual([]);
  });
});

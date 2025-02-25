import { hasKey } from '..';

describe('hasKey', () => {
  it('should find all keys', () => {
    const val = { a: 1, b: null, c: { d: 1 } };
    expect(hasKey('c', val)).toEqual(true);
  });

  it('should not find all keys', () => {
    const val = { a: 1, b: null, c: { d: 1 } };
    expect(hasKey('f', val)).toEqual(false);
  });
});

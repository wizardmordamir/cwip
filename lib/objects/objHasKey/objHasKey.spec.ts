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

  it('should be curried', () => {
    const val = { a: 1, b: null, c: { d: 1 } };
    const hasC = hasKey('c');
    expect(hasC(val)).toEqual(true);
  });
});

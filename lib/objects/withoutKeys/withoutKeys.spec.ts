import { withoutKeys } from '..';

describe('withoutKeys', () => {
  it('should remove keys from object', () => {
    const val = { a: 1, b: null, c: { d: 1 } };
    expect(withoutKeys(val, ['b', 'c'])).toEqual({ a: 1 });
  });
});

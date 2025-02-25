import { reduceKeys } from './index';

const obj = { a: 1, b: 2, c: 3 };

describe('reduceKeys', () => {
  it('should return a new object with only the specified keys', () => {
    const result = reduceKeys(obj, ['a', 'b']);

    expect(result).toEqual({ a: 1, b: 2 });
  });
});

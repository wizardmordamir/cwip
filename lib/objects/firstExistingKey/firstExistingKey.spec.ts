import { firstExistingKey } from '.';

describe('firstExistingKey', () => {
  it('should get first existing key from array', () => {
    const val = { a: 1, b: null, c: { d: 1 } };
    expect(firstExistingKey(['b', 1, 'a', 'c', 2], val)).toEqual('a');
  });

  it('should not have first existing key from array', () => {
    const val = { a: 1, b: null, c: { d: 1 } };
    expect(firstExistingKey(['b', 1, 'ab', 'cd', 2], val)).toEqual(undefined);
  });
});
